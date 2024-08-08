import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';

import React, { useRef,useEffect, useState } from 'react';
import { ForceGraph2D,ForceGraph3D } from 'react-force-graph';
import Graph from 'graphology';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import louvain from 'graphology-communities-louvain';

import { scaleOrdinal } from 'd3-scale';
import { schemeCategory10 } from 'd3-scale-chromatic'; // Or any other D3 color scheme

import { PCA } from 'ml-pca';
const kmeans = require('ml-kmeans');

//import * as d3 from 'd3';
import convexHull from 'convex-hull'
import chroma from 'chroma-js';
const infomap = require('infomap');
const llp = require('layered-label-propagation');
const hamming = require('./distance-hamming')

//import { node } from 'webpack';

// Use an ordinal scale for colors with a D3 color scheme
const colorScale = scaleOrdinal(schemeCategory10);

const GraphCommunities = ({ data, segments,segmentsSelected, setSegmentsSelected, selectedSegment, pixelData,setPixelData,setPixelMapData }) => {
  const fgRef = useRef();
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [orgCommunities, setOrgCommunities] = useState({ nodes: [], links: [] });
  const [isEmpty, setIsEmpty] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  const [nodeScale, setNodeScale] = useState(1);

  const [use3D, setUse3D] = useState(0)

  const [multiSelect, setMultiSelect] = useState(false);
  const [selectedNodes, setSelectedNodes] = useState([]);
  const [allGroups, setAllGroups] = useState([]);

  const [undoState, setUndoState] = useState(false);

  const [algorithm, setAlgorithm] = useState('Louvain');
  const [inputs, setInputs] = useState({
    resolution: 1,
    randomWalk: false,
    min: 0.01,
    gamma: 0.1,
    max: 10,
    dims: 5,
    kmean: 8
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setInputs({
      ...inputs,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  useEffect(() => {

    console.log("RUN")

    if (!isEmpty){
      fgRef.current.d3Force('link')
      .distance(link => {
        if (link.source.groupID.length>0 && (link.source.groupID[0] == link.target.groupID[0])){
          console.log(link)
          return -15;
        }
        
        return 30;
      })
      if (use3D){
          const bloomPass = new UnrealBloomPass();
          bloomPass.strength = 1;
          bloomPass.radius = 1;
          bloomPass.threshold = 0;
          fgRef.current.postProcessingComposer().addPass(bloomPass);
      }
    }
  }, [isEmpty,use3D, data]);

  const saveUndo = () =>{

    const nlinks = graphData.links.map(obj => ({
      source: obj.source.id,
      target: obj.target.id}
      ))

    const sGraphData = {
      nodes:graphData.nodes,
      links:nlinks
    }

    const undo = {
      graphData:sGraphData,
      orgCommunities,
      isEmpty,
      selectedNode,
      selectedNodes,
      multiSelect,
      allGroups
    }

    setUndoState(JSON.stringify(undo));
  }

  const handleUndo = (data=false) =>{
    if (!undoState)
      return;
    if (!data)
      data = undoState;
    else{
      setUndoState(data);
    }
    const undo = JSON.parse(data);
    //console.log(undo.graphData);
    setGraphData(undo.graphData);
    setOrgCommunities(undo.orgCommunities);
    setIsEmpty(undo.isEmpty);
    setSelectedNode(undo.selectedNode);
    setSelectedNodes(undo.selectedNodes);
    setMultiSelect(undo.multiSelect);
    setAllGroups(undo.allGroups);

  }

  // Function to get an object with only keys from 0 to n-1
function getFirstNKeys(obj, n) {
  const result = {};
  for (let i = 0; i < n; i++) {
      if (obj.hasOwnProperty(i)) {
          result[i] = obj[i];
      }
  }
  return result;
}

function fillHolesInCommunities(communities) {
  const sortedKeys = Object.keys(communities).map(Number).sort((a, b) => a - b);
  const newCommunities = {};
  let gapCount = 0;

  for (let i = 0; i < sortedKeys.length; i++) {
      // Check if there is a hole
      if (i > 0 && sortedKeys[i] !== sortedKeys[i - 1] + 1) {
          gapCount += sortedKeys[i] - sortedKeys[i - 1] - 1;
      }
      newCommunities[sortedKeys[i] - gapCount] = communities[sortedKeys[i]];
  }

  return newCommunities;
}

function pcaKmeansStreamlineClustering(segments, pcaDims, k) {
  // Step 1a: Group segments by streamline
  const streamlineIndices = {};
  segments.forEach((segment, idx) => {
      if (!streamlineIndices[segment.lineIDx]) {
          streamlineIndices[segment.lineIDx] = [idx, idx];
      } else {
          streamlineIndices[segment.lineIDx][1] = idx;
      }
  });

  const streamlines = Object.values(streamlineIndices); // Array of [startIdx, endIdx]

  // Step 2: Determine average streamline length
  const avgLength = Math.round(streamlines.reduce((sum, s) => sum + (s[1] - s[0] + 1), 0) / streamlines.length);

// Step 3: Pad/Trim Streamlines to average length
const paddedStreamlines = streamlines.map(([startIdx, endIdx]) => {
  let streamline = segments.slice(startIdx, endIdx + 1);
  let streamlineLength = streamline.length;

  // Flatten the streamline and ensure all values are numeric
  let flattenedStreamline = streamline.flatMap(segment => [
      ...segment.startPoint, 
      ...segment.endPoint, 
      ...segment.midPoint
  ]);

  if (streamlineLength < avgLength) {
      // Pad with zeroes to reach the desired length
      const paddingSize = (avgLength - streamlineLength) * 9; // 9 for 3 coordinates each of start, end, and mid points
      flattenedStreamline = [...flattenedStreamline, ...Array(paddingSize).fill(0)];
  } else if (streamlineLength > avgLength) {
      // Trim to the average length (each segment has 9 values)
      flattenedStreamline = flattenedStreamline.slice(0, avgLength * 9);
  }

  return flattenedStreamline;
});


  // Step 4: Apply PCA and KMeans
  const pca = new PCA(paddedStreamlines);
  const reducedData = pca.predict(paddedStreamlines, { nComponents: pcaDims });
  const reducedDataArray = Array.from(reducedData.data).map(row => Array.from(row));
  let ans = kmeans.kmeans(reducedDataArray, k);

  // Step 5: Assign clusters to segments
  const communities = {};
  ans.clusters.forEach((cluster, streamlineIndex) => {
      const [startIdx, endIdx] = streamlines[streamlineIndex];
      for (let i = startIdx; i <= endIdx; i++) {
          communities[i] = cluster;
      }
  });

  return fillHolesInCommunities(communities);
}

  function pcaKmeansCommunityDetection(segments, pcaDims, k) {
    // Step 1: Prepare data for PCA with new feature extraction
    const data = segments.map(segment => {
      const length = Math.sqrt(
          Math.pow(segment.endPoint[0] - segment.startPoint[0], 2) +
          Math.pow(segment.endPoint[1] - segment.startPoint[1], 2) +
          Math.pow(segment.endPoint[2] - segment.startPoint[2], 2)
      );
      const direction = [
          (segment.endPoint[0] - segment.startPoint[0]) / length,
          (segment.endPoint[1] - segment.startPoint[1]) / length,
          (segment.endPoint[2] - segment.startPoint[2]) / length,
      ];
      return [length, ...direction, ...segment.midPoint];
  });

    // Step 2: Apply PCA
    const pca = new PCA(data);
    const reducedData = pca.predict(data, { nComponents: pcaDims });
    const reducedDataArray = Array.from(reducedData.data).map(row => Array.from(row));
    // Step 3: Apply KMeans
    console.log(reducedDataArray);
    let ans = kmeans.kmeans(reducedDataArray, k);
    //const clusters = kmeans.predict(reducedData);

    // Step 4: Assign clusters to segments
    const communities = {};
    ans.clusters.forEach((cluster, index) => {
        const segmentIdx = segments[index].globalIdx; // Assuming globalIdx uniquely identifies a segment
        communities[segmentIdx] = cluster;
    });
    
    return fillHolesInCommunities(communities);
}

  useEffect(()=>{
    let { nodes, links } = graphData;
    const nid = orgCommunities[selectedSegment];
    const snode = nodes.filter(n=>{
      return n.id == nid;
    })

    if (snode.length == 0){
      console.log("Not found!", nid)
    }

    setMultiSelect(false);
    setSelectedNode(snode[0]);
  },[selectedSegment])


  //useEffect(() => {
  const handleStart = () => {
    // Check if the graph is empty
    const isEmptyGraph = data.every(arr => arr.length === 0);
    setIsEmpty(isEmptyGraph);
  
    if (isEmptyGraph) {
      console.log('Graph is empty, nothing to layout.');
      return; // Do not attempt to plot if the graph is empty
    }
  
    const graph = new Graph(); // Create a graph
    const communityGraph = new Graph(); // This will store the community graph
    const communitySizes = {}; // To store the size of each community
  
    const imapNodes = []
    const imapEdges = []

    //console.log(segments);
      // Add nodes first
    data.forEach((_, nodeIndex) => {
        if (!graph.hasNode(nodeIndex)) {
        graph.addNode(nodeIndex);
        }
        imapNodes.push(nodeIndex)
    });

    // Then add edges
    data.forEach((edges, source) => {
        edges.forEach(target => {
          imapEdges.push({
            source, target, value:1
          })
        // Ensure both source and target nodes exist
        if (!graph.hasNode(target)) {
            graph.addNode(target);
        }
        if (!graph.hasEdge(source, target)) {
            graph.addEdge(source, target);
        }
        });
    });

    console.log(data.length)
    console.log(data)

    //let node2com = infomap.jInfomap(imapNodes, imapEdges, 0.0000001);
    //let node2com = llp.jLayeredLabelPropagation(imapNodes, imapEdges, 1, 10);
  
    // Detect communities
    let communities;

    switch (algorithm) {
      case 'Louvain':
        //console.log("HERE")
        communities = louvain(graph, {
          resolution: inputs.resolution,
          randomWalk: inputs.randomWalk
        });
        break;
      case 'PCA':
        communities = pcaKmeansStreamlineClustering(segments, inputs.dims, inputs.kmean);
        //communities = getFirstNKeys(communities, data.length+1);
      break;
      case 'Infomap':
        communities = infomap.jInfomap(imapNodes, imapEdges, inputs.min);
        break;
      case 'Hamming Distance':
        communities = hamming.jHamming(nodes, links, inputs.min);
        break;
      case 'Label Propagation':
        communities = llp.jLayeredLabelPropagation(imapNodes, imapEdges, inputs.gamma, inputs.max);
        break;
      case 'Blank':
        communities = Array.from({ length: segments.length }, (_, i) => [i, 0]).reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});
        break;

    }
    
    const comms = {};
    Object.keys(communities).forEach(k=>{comms[communities[k]]=1});
    console.log("NUM COMMUNITIES: ",Object.keys(comms).length );

    //console.log(node2com)
    console.log("comms:", communities)

    setOrgCommunities(communities);

    ///color all!!
    Object.entries(communities).forEach(([nodeId, communityIndex]) => {
        const color= colorScale(communityIndex.toString())
        //console.log(`Node ${nodeId}: Community ${communityIndex} Color: ${color}`);
        if (!segments[parseInt(nodeId)])
          console.log(nodeId)
        else
          segments[parseInt(nodeId)].color = color;
        //setSegmentsSelected(segments)
      });
    //CHECKKKKK!!!
    setSegmentsSelected(segments)
  
    // Process communities, creating nodes for each community and counting sizes
    Object.entries(communities).forEach(([node, community]) => {
      if (!segments[parseInt(node)])
        return;
      if (!communityGraph.hasNode(community)) {
        communityGraph.addNode(community, { size: 1 });
      } else {
        communityGraph.updateNodeAttribute(community, 'size', size => size + 1);
      }
    });
  
    // Now, let's prepare data for visualization
    const nodes = communityGraph.nodes().map(node => ({
      id: node,
      size: communityGraph.getNodeAttribute(node, 'size')/2,
    }));

    // After computing community sizes but before setting the graphData:
    const scaleFactor = 0.02; // Adjust this scaling factor as needed
    const scaledNodes = nodes.map(node => ({
        ...node,
        size: node.size * scaleFactor,
    }));

    console.log("NODE SIZE: ", nodes[0].size * scaleFactor)

    // Assign a color to each community node
    const nodesWithColors = scaledNodes.map(node => ({
        ...node,
        color: colorScale(node.id.toString()), // Convert node id to string for the scale function
    }));
  
    // No edges between communities are added for now, 
    // as we don't have the information about inter-community connections here.
    // You might need additional logic to determine and add these connections if needed.

    // Detected communities: communities (a mapping of node -> community)

    let interCommunityLinks = [];

    // Assuming `data` is an adjacency list representation of the original graph
    data.forEach((edges, source) => {
    edges.forEach(target => {
        const sourceCommunity = communities[source];
        const targetCommunity = communities[target];
        //if (!targetCommunity)
         // console.log(target, communities[target])

        if (sourceCommunity !== targetCommunity) {
        // This is an inter-community link
        const linkExists = interCommunityLinks.some(link => 
            (link.source === sourceCommunity && link.target === targetCommunity) ||
            (link.source === targetCommunity && link.target === sourceCommunity)
        );

        if (!linkExists && sourceCommunity != 0) {
            interCommunityLinks.push({
            source: sourceCommunity.toString(),
            target: targetCommunity.toString()
            });
            //console.log([sourceCommunity,targetCommunity,sourceCommunity.toString(), targetCommunity.toString()])
        }
        }
    });
    });

    // Deduplicate the links
    const linkPairs = new Set();
    interCommunityLinks = interCommunityLinks.filter(link => {
        const sortedPair = [link.source, link.target].sort().join('_');
        if (linkPairs.has(sortedPair)) {
        return false;
        } else {
        linkPairs.add(sortedPair);
        return true;
        }
    });

    /*interCommunityLinks = interCommunityLinks.map(obj => ({
        source: obj.source.id,
        target: obj.target.id}
        ))*/
    //console.log(interCommunityLinks)
    //console.log(interCommunityLinks[0])
    //console.log(interCommunityLinks[0].source)

    // Now, interCommunityLinks contains all the edges between different communities.

    // Modify the nodes structure to include the original nodes for each community
    const communityMembers = {};
    Object.entries(communities).forEach(([originalNode, communityId]) => {
      if (!segments[parseInt(originalNode)])
        return;

        if (!communityMembers[communityId]) {
        communityMembers[communityId] = [];
        }
        communityMembers[communityId].push(parseInt(originalNode, 10));
    });

    const nodesWithCommunityMembers = nodesWithColors.map(node => ({
        ...node,
        members: communityMembers[node.id] || [],
        groupID: []
    }));

    //console.log("nodesWithCommunityMembers: ",nodesWithCommunityMembers)

    setGraphData({
      //nodes,
      nodes:nodesWithCommunityMembers,
      links: interCommunityLinks//[], // No inter-community links for this simplified visualization
    });

    saveUndo();
  
  }//, [data]);
  
  const renderInputs = () => {
    switch (algorithm) {
      case 'Louvain':
        return (
          <>
            <label>
              Resolution:
              <input
                type="text"
                style = {{ width: '100px' }}
                name="resolution"
                value={inputs.resolution}
                onChange={handleInputChange}
              />
            </label>
            <label>
              Random Walk:
              <input
                type="checkbox"
                name="randomWalk"
                checked={inputs.randomWalk}
                onChange={handleInputChange}
              />
            </label>
          </>
        );
      case 'PCA':
        return (
          <>
            <label>
              Dims:
              <input
                type="text"
                style = {{ width: '100px' }}
                name="Dims"
                value={inputs.dims}
                onChange={handleInputChange}
              />
            </label>

            <label>
              kmeans:
              <input
                type="text"
                style = {{ width: '100px' }}
                name="Kmeans"
                value={inputs.kmean}
                onChange={handleInputChange}
              />
            </label>
          </>
        )
      case 'Infomap':
        return (
          <label>
            Min:
            <input
              type="text"
              style = {{ width: '100px' }}
              name="min"
              value={inputs.min}
              onChange={handleInputChange}
            />
          </label>
        );
      case 'Hamming Distance':
        return (
          <label>
            Min:
            <input
              style = {{ width: '100px' }}
              type="text"
              name="min"
              value={inputs.min}
              onChange={handleInputChange}
            />
          </label>
        );
      case 'Blank':
        return (
          <></>
        );
      case 'Label Propagation':
        return (
          <>
            <label>
              Gamma:
              <input
                type="text"
                style = {{ width: '100px' }}
                name="gamma"
                value={inputs.gamma}
                onChange={handleInputChange}
              />
            </label>
            <label>
              Max:
              <input
                type="text"
                style = {{ width: '100px' }}
                name="max"
                value={inputs.max}
                onChange={handleInputChange}
              />
            </label>
          </>
        );
      default:
        return null;
    }
  };

  if (isEmpty) {
    // If the graph is empty, we can return null or some placeholder
    //return <div>No data available to plot the graph.</div>;
    return (<div><button
    onClick={() => handleStart()}
    disabled={multiSelect}
  >
  Start
  </button> 
  <label>
    Algorithm:
    <select value={algorithm} onChange={(e) => setAlgorithm(e.target.value)}>
      <option value="Louvain">Louvain</option>
      <option value="PCA">PCA k-means</option>
      <option value="Infomap">Infomap</option>
      <option value="Label Propagation">Label Propagation</option>
      <option value="Hamming Distance">Hamming Distance</option>
      <option value="Blank">Blank</option>
    </select>
  </label>
  {renderInputs()}
  <label>
    Node Scale:
    <input defaultValue={nodeScale} style={{ maxWidth: '45px' }} type="number" onChange={(e)=>{setNodeScale(Number(e.target.value));}} />
  </label>
</div>)
  }

  function computeSizes(nodes) {
      // Find min and max number of members
      let minMembers = Infinity, maxMembers = -Infinity;
      nodes.forEach(node => {
          minMembers = Math.min(minMembers, node.members.length);
          maxMembers = Math.max(maxMembers, node.members.length);
      });

      // Define the log base - using e (natural logarithm) for simplicity
      const logBase = Math.E;

      // Function to calculate size based on members count
      const logScaleSize = (membersCount, a, b) => {
          return a + b * Math.log(membersCount) / Math.log(logBase);
      };

      // Calculate constants a and b for the scale
      // Solve for a and b using the equations for min and max members
      const b = 9 / (Math.log(maxMembers) - Math.log(minMembers)); // (10 - 1) = 9 is the range of sizes
      const a = 1 - b * Math.log(minMembers);

      // Calculate and assign sizes
      nodes.forEach(node => {
          node.size = logScaleSize(node.members.length, a, b);
          // Ensure size is within bounds
          node.size = Math.max(1, Math.min(node.size, 10));
      });

      return nodes;
  }

  const updateGroups = (nodes) => {
    const groups = {};

    nodes.forEach(node => {
      if (Array.isArray(node.groupID)) {
        //console.log(node.groupID)
        node.groupID = [...new Set(node.groupID)]
        node.groupID.forEach(groupID => {
          if (groups.hasOwnProperty(groupID)) {
            groups[groupID]++; // Increment the frequency if the key exists
          } else {
            groups[groupID] = 1; // Initialize the frequency if the key doesn't exist
          }
        });
      }
    });

    computeSizes(nodes);
    //console.log(groups)
    console.log("GROUPS: ", groups)
    setAllGroups(groups);
    return groups;
  }

  const handleMergeCommunitiesP = (pNodes) => {
  
    console.log(pNodes)
    console.log(selectedNodes)

      const toMerge = pNodes.map(node => node.id);
      let { nodes, links } = graphData;

      if (pNodes[0].groupID.length > 0){//already in group
          const mGroupID = pNodes[0].groupID;
          
      } 
      const mergedGroupID = [].concat(...pNodes.map(obj => obj.groupID));

      //console.log(orgCommunities)
      

      //convert the links back
      links = links.map(obj => ({
          source: obj.source.id,
          target: obj.target.id}
          ))

      // Find an unused community index (node ID)
      const allCommunityIndexes = nodes.map(node => node.id);
      const maxCommunityIndex = allCommunityIndexes.length > 0 ? Math.max(...allCommunityIndexes) : 0;
      const newCommunityIndex = maxCommunityIndex + 1;

      const mergeIds = pNodes.map(object => object.id);
      // Iterate over the mergeArray
      for (let key in orgCommunities) {
        if (mergeIds.includes(orgCommunities[key].toString())) {
          orgCommunities[key] = newCommunityIndex;
          //console.log(key)
        }
      }
    setOrgCommunities(orgCommunities);



      // Merge member lists of communities specified in 'toMerge'
      const mergedMembers = toMerge
          .flatMap(communityIndex => {
          // Find the node that corresponds to the current community index and get its members
          const node = nodes.find(n => n.id === communityIndex);
          return node ? node.members : [];
          });


      const removed_nodes = nodes.filter(node => toMerge.includes(node.id));


      // Remove the nodes that are merged
      nodes = nodes.filter(node => !toMerge.includes(node.id));

      const newsize = removed_nodes.reduce((totalSize, obj) => totalSize + obj.size, 0);

      // Create a new node for the merged community
      const newCommunityNode = {
          // Copy other properties
          ...removed_nodes[0],
          id: newCommunityIndex,
          members: mergedMembers,
          size: newsize,
          groupID: [...mergedGroupID]
          
      };
      nodes.push(newCommunityNode);

      // Update the links to reflect the merge
      //console.log(toMerge)
      //console.log(links[0])
      links = links.map(link => {

          // Update the source and target of the link if they refer to a community that was merged
          return {
          source: toMerge.includes(link.source) ? newCommunityIndex : link.source,
          target: toMerge.includes(link.target) ? newCommunityIndex : link.target,
          };
      }).filter(link => link.source !== link.target); // Remove self-links


      // Deduplicate the links
      const linkPairs = new Set();
      links = links.filter(link => {
          const sortedPair = [link.source, link.target].sort().join('_');
          if (linkPairs.has(sortedPair)) {
          return false;
          } else {
          linkPairs.add(sortedPair);
          return true;
          }
      });

      //deselect the ui multiselect mode
      setSelectedNodes([])
      setMultiSelect(false)

      //update the 3D view with the new merged segment colors
      let selected = []
      newCommunityNode.members.forEach(idx=>{
          let seg = segments[parseInt(idx)];
          seg.color = newCommunityNode.color;
          //console.log(seg.color);
          selected.push(seg)
      })
      setSegmentsSelected(selected)
      setSelectedNode(newCommunityNode)

      updateGroups(nodes);

      // Set the updated nodes and links to the state
      setGraphData({
          nodes: nodes,
          links: links,
      });

      saveUndo();
      return newCommunityNode;
}

  const handleMergeCommunities = () => {

      console.log(selectedNodes)
      console.log(selectedNodes)

        const toMerge = selectedNodes.map(node => node.id);
        let { nodes, links } = graphData;

        if (selectedNodes[0].groupID.length > 0){//already in group
            const mGroupID = selectedNodes[0].groupID;
            
        } 
        const mergedGroupID = [].concat(...selectedNodes.map(obj => obj.groupID));

        //console.log(orgCommunities)
        

        //convert the links back
        links = links.map(obj => ({
            source: obj.source.id,
            target: obj.target.id}
            ))

        // Find an unused community index (node ID)
        const allCommunityIndexes = nodes.map(node => node.id);
        const maxCommunityIndex = allCommunityIndexes.length > 0 ? Math.max(...allCommunityIndexes) : 0;
        const newCommunityIndex = maxCommunityIndex + 1;

        const mergeIds = selectedNodes.map(object => object.id);
        // Iterate over the mergeArray
        for (let key in orgCommunities) {
          if (mergeIds.includes(orgCommunities[key].toString())) {
            orgCommunities[key] = newCommunityIndex;
            //console.log(key)
          }
        }
      setOrgCommunities(orgCommunities);



        // Merge member lists of communities specified in 'toMerge'
        const mergedMembers = toMerge
            .flatMap(communityIndex => {
            // Find the node that corresponds to the current community index and get its members
            const node = nodes.find(n => n.id === communityIndex);
            return node ? node.members : [];
            });


        const removed_nodes = nodes.filter(node => toMerge.includes(node.id));


        // Remove the nodes that are merged
        nodes = nodes.filter(node => !toMerge.includes(node.id));

        const newsize = removed_nodes.reduce((totalSize, obj) => totalSize + obj.size, 0);

        // Create a new node for the merged community
        const newCommunityNode = {
            // Copy other properties
            ...removed_nodes[0],
            id: newCommunityIndex,
            members: mergedMembers,
            size: newsize,
            groupID: [...mergedGroupID]
            
        };
        nodes.push(newCommunityNode);

        // Update the links to reflect the merge
        //console.log(toMerge)
        //console.log(links[0])
        links = links.map(link => {

            // Update the source and target of the link if they refer to a community that was merged
            return {
            source: toMerge.includes(link.source) ? newCommunityIndex : link.source,
            target: toMerge.includes(link.target) ? newCommunityIndex : link.target,
            };
        }).filter(link => link.source !== link.target); // Remove self-links


        // Deduplicate the links
        const linkPairs = new Set();
        links = links.filter(link => {
            const sortedPair = [link.source, link.target].sort().join('_');
            if (linkPairs.has(sortedPair)) {
            return false;
            } else {
            linkPairs.add(sortedPair);
            return true;
            }
        });

        //deselect the ui multiselect mode
        setSelectedNodes([])
        setMultiSelect(false)

        //update the 3D view with the new merged segment colors
        let selected = []
        newCommunityNode.members.forEach(idx=>{
            let seg = segments[parseInt(idx)];
            seg.color = newCommunityNode.color;
            //console.log(seg.color);
            selected.push(seg)
        })
        setSegmentsSelected(selected)
        setSelectedNode(newCommunityNode)

        updateGroups(nodes);

        // Set the updated nodes and links to the state
        setGraphData({
            nodes: nodes,
            links: links,
        });

        saveUndo();
        return newCommunityNode;
  }

  const handleSplitCommunity = (splitInto) => {
    const communityIndex = selectedNode.id
    const X = 3
    const orgSize = selectedNode.size

    let { nodes, links } = graphData;

    // Find an unused community index (node ID)
    const allCommunityIndexes = nodes.map(node => node.id);
    const maxCommunityIndex = allCommunityIndexes.length > 0 ? Math.max(...allCommunityIndexes) + 1 : 0 + 1;

    //conver the links back
    links = links.map(obj => ({
        source: obj.source.id,
        target: obj.target.id}
        ))

    // Find the community node to split
    let communityNode = nodes.find(node => node.id === communityIndex);

    if (nodes.length == 1){
      communityNode = nodes[0];
    }
    else if (!communityNode) {
        console.error("Community to split not found");
        return;
    }


    // Calculate new community size, assume communityNode.members is an array of member IDs
    const totalMembers = communityNode.members.length;
    const membersPerNewCommunity = Math.ceil(totalMembers / X);
    
    // Remove the original community node
    nodes = nodes.filter(node => node.id !== communityIndex);
    //communityNode.groupID=[];

    /*

    // Hold new communities to update links later
    let newCommunityIndexes = [];

    // Create new community nodes
    let newCommunityNodes = [];
    for (let i = 0; i < X; i++) {
        // Slice the array for members of each new community
        const start = i * membersPerNewCommunity;
        const end = start + membersPerNewCommunity;
        const newCommunityMembers = communityNode.members.slice(start, Math.min(end, totalMembers));
        
        // Find a new id for the community
        const newId = Math.max(...nodes.map(node => parseInt(node.id))) + 1 + i;
        newCommunityIndexes.push(newId.toString()); // Save new community ID for link duplication

        // Create new community object
        const newCommunity = {
            ...communityNode, // Copy properties from the original community
            id: newId.toString(),
            members: newCommunityMembers,
            size: (newCommunityMembers.length/totalMembers)*orgSize,
            color: colorScale(newId.toString())
        };

        newCommunityNodes.push(newCommunity);
        nodes.push(newCommunity); // Add new community to nodes list
    }

    // Duplicate links for each new community created
    const originalCommunityLinks = links.filter(link => link.source === communityIndex || link.target === communityIndex);
    let newLinks = links.filter(link => link.source !== communityIndex && link.target !== communityIndex); // Exclude original community's links

    // Add duplicated links for each new community
    newCommunityIndexes.forEach(newIndex => {
        originalCommunityLinks.forEach(link => {
            const newLink = { ...link };
            if (newLink.source === communityIndex) newLink.source = newIndex;
            if (newLink.target === communityIndex) newLink.target = newIndex;
            newLinks.push(newLink);
        });
    });

    // Filter out links that no longer connect two different communities
    links = links.filter(link => link.source !== link.target);*/

    //////////
    let newLinks = links.filter(link => link.source !== communityIndex && link.target !== communityIndex); // Exclude original community's links
    console.log(`${newLinks.length} ${links.length}`)
    console.log(newLinks)

    let fnodes, fdata,interCommunityLinks;
    const graph = new Graph(); // Create a graph
    const communityGraph = new Graph(); // This will store the community graph
    
    const indicesToFilter = communityNode.members;


    const imapNodes = []
    const imapEdges = []

    if (splitInto){
      fnodes = splitInto.nodes;
      fdata = splitInto;
      interCommunityLinks = fdata.links;
      //alert("ARASD")
    }else{
      //alert("HERE")


    fdata = indicesToFilter.map(index => data[index]);
      // Add nodes first
    fdata.forEach((_, nodeIndex) => {
        if (!graph.hasNode(indicesToFilter[nodeIndex])) {
            //console.log(nodeIndex)
            graph.addNode(indicesToFilter[nodeIndex]);
        }
        imapNodes.push(indicesToFilter[nodeIndex])
    });
    
    // Then add edges
    fdata.forEach((edges, source) => {
        const src = source
        edges.forEach(target => {
        //if (!indicesToFilter[source])
            //console.log(`${source} ${indicesToFilter[source]}`)
        source = indicesToFilter[src]
        target = target
        //WARNING
        if ((source === 0 && target) || (source && target)){
          imapEdges.push({
            source, target, value:1
          })
            //console.log(`FOUND SRC TGT: ${source}, ${target}`)
            // Ensure both source and target nodes exist
            if (!graph.hasNode(target)) {
                //graph.addNode(target);
                //console.log(`WARNING! ${target}`)
            }else if (!graph.hasEdge(source, target)) {
                graph.addEdge(source, target);
                //console.log(`ADDED! ${[source,target]}`)
            }
        }else{
            //console.log(`UNDEFINED SRC TGT: ${source}, ${target}`)
        }
        });
        
    });
    //console.log(graph)
    
    console.log("imapNodes",imapNodes)
    console.log("imapEdges",imapEdges)
  
    // Detect communities
    //const communities = louvain(graph);
    let communities;
    switch (algorithm) {
      case 'Louvain':
        communities = louvain(graph, {
          resolution: inputs.resolution,
          randomWalk: inputs.randomWalk
        });
        break;
      case 'Infomap':
        communities = infomap.jInfomap(imapNodes, imapEdges, inputs.min);
        break;
      case 'Hamming Distance':
        communities = hamming.jHamming(nodes, links, inputs.min);
        break;
      case 'Label Propagation':
        communities = llp.jLayeredLabelPropagation(imapNodes, imapEdges, inputs.gamma, inputs.max);
        break;

      case 'Selected':
        communities = Array.from({ length: imapNodes.length }, (_, i) => [i, 0]).reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});
        console.log("segmentsSelected:",segmentsSelected)
        segmentsSelected.forEach(seg=>{
          if (communities[seg.globalIdx] !== undefined){
            communities[seg.globalIdx] = 1;
          }
        })
        break;
  

    }

    

    console.log("comm: ",communities)
  
    // Process communities, creating nodes for each community and counting sizes
    Object.entries(communities).forEach(([node, community]) => {
      if (!communityGraph.hasNode(community)) {
        communityGraph.addNode(community, { size: 1 });
      } else {
        communityGraph.updateNodeAttribute(community, 'size', size => size + 1);
      }
    });

    //let groupColor = d3.rgb(colorScale(maxCommunityIndex.toString())); // Convert to RGB
    let groupColor = chroma(colorScale(maxCommunityIndex.toString())).rgb(); // Convert to RGB
    let groupColorWithOpacity = `rgba(${groupColor[0]}, ${groupColor[1]}, ${groupColor[2]}, 0.1)`;
  
    // Now, let's prepare data for visualization
    fnodes = communityGraph.nodes().map(node => ({
      id: node.toString(),
      size: (communityGraph.getNodeAttribute(node, 'size')/totalMembers)*orgSize,
      color: colorScale(node.toString()),
      groupID: (algorithm !== 'Selected')?[...communityNode.groupID, maxCommunityIndex]:[...communityNode.groupID],
      groupColor: groupColorWithOpacity,//colorScale(maxCommunityIndex.toString()),
      groupSize: communityGraph.nodes().length
    }));

    //if (algorithm == 'Selected')
    //  fnodes.groupID = [];

    // Detected communities: communities (a mapping of node -> community)

    interCommunityLinks = [];

    // Assuming `data` is an adjacency list representation of the original graph

    if (algorithm !== 'Selected')
    fdata.forEach((edges, source) => {
    source = indicesToFilter[source]
    edges.forEach(target => {
        //target = indicesToFilter[target]
        const sourceCommunity = communities[source] + maxCommunityIndex;
        const targetCommunity = communities[target] + maxCommunityIndex;

        //WARNING
        if (targetCommunity && sourceCommunity != communityIndex && targetCommunity != communityIndex){


            if (sourceCommunity !== targetCommunity) {
            // This is an inter-community link
            const linkExists = interCommunityLinks.some(link => 
                (link.source === sourceCommunity && link.target === targetCommunity) ||
                (link.source === targetCommunity && link.target === sourceCommunity)
            );

            if (!sourceCommunity || !targetCommunity)
                console.log([sourceCommunity,targetCommunity,source, target])
            if (!linkExists && sourceCommunity != 0) {
                interCommunityLinks.push({
                source: sourceCommunity.toString(),
                target: targetCommunity.toString()
                });
                //console.log([sourceCommunity,targetCommunity,sourceCommunity.toString(), targetCommunity.toString()])
            }
            }
        }
    });
    });
    //test
    //console.log(`removing ${communityIndex}`)

    if (algorithm !== 'Selected')
    data.forEach((edges, source) => {

        edges.forEach(target => {
            const sourceCommunity = orgCommunities[source];
            let targetCommunity = orgCommunities[target];
            if (sourceCommunity == communityIndex || targetCommunity != communityIndex || communities[target] + maxCommunityIndex == communityIndex)
                return;

            targetCommunity = communities[target] + maxCommunityIndex;
    
            if (sourceCommunity !== targetCommunity) {
            // This is an inter-community link
            const linkExists = interCommunityLinks.some(link => 
                (link.source === sourceCommunity && link.target === targetCommunity) ||
                (link.source === targetCommunity && link.target === sourceCommunity)
            );
    
            if (!linkExists && sourceCommunity != 0) {
                interCommunityLinks.push({
                source: sourceCommunity.toString(),
                target: targetCommunity.toString()
                });
                //console.log([sourceCommunity,targetCommunity,sourceCommunity.toString(), targetCommunity.toString()])
            }
            }
        });
        });

      

    //endtest

    // Deduplicate the links
    const linkPairs = new Set();
    interCommunityLinks = interCommunityLinks.filter(link => {
        const sortedPair = [link.source, link.target].sort().join('_');
        if (linkPairs.has(sortedPair)) {
        return false;
        } else {
        linkPairs.add(sortedPair);
        return true;
        }
    });

    // Now, interCommunityLinks contains all the edges between different communities.
    //console.log(communities)
    //console.log(orgCommunities)

    // Create a new object by adding the constant to each key and value of obj2
    let adjustedComm = Object.keys(communities).reduce((newObj, key) => {
        // Convert key to a number since Object.keys returns an array of strings
        let adjustedKey = parseInt(key) + maxCommunityIndex;
        let adjustedValue = communities[key] + maxCommunityIndex;
        newObj[key] = adjustedValue;
        return newObj;
    }, {});

    console.log(adjustedComm)
    setOrgCommunities({...orgCommunities, ...adjustedComm})

    //console.log(indicesToFilter)
    //console.log(interCommunityLinks)
    
    // Modify the nodes structure to include the original nodes for each community
    const communityMembers = {};
    Object.entries(communities).forEach(([originalNode, communityId]) => {
        //communityId += maxCommunityIndex
        if (!communityMembers[communityId]) {
            communityMembers[communityId] = [];
        }
        //communityMembers[communityId].push(parseInt(indicesToFilter[originalNode], 10));
        communityMembers[communityId].push(parseInt(originalNode, 10));
    });

  

    //console.log(indicesToFilter)
    
    //console.log(communityMembers)

    fnodes = fnodes.map(node => ({
        ...node,
        id: (parseInt(node.id) + maxCommunityIndex).toString(),
        members: communityMembers[node.id] || [],
    }));

  }

  let seenIds = new Set();
  let duplicates = [];
  
  fnodes.forEach(node => {
      if (seenIds.has(node.id)) {
          duplicates.push(node); // This node is a duplicate
      } else {
          seenIds.add(node.id);
      }
  });
  
  if (duplicates.length > 0) {
      console.log("Duplicate nodes found:", duplicates);
  } else {
      console.log("No duplicate nodes found.");
  }

    //console.log(fnodes)
    fnodes = nodes.concat(fnodes)
    newLinks = newLinks.concat(interCommunityLinks)

    /////////

    updateGroups(fnodes);
    
    // Set the updated nodes and links to the state
    setGraphData({
        nodes: fnodes,
        links: newLinks
        //links: newLinks,
    });

    saveUndo();
  }

  const handleCollaspeGroup = ()=>{
    const communityIndex = selectedNode.id
    const groupID = selectedNode.groupID[0] //first group for now
    let { nodes, links } = graphData;

    // Find an unused community index (node ID)
    

    const nodeMembers = nodes.filter(node => node.groupID.includes(groupID));
    let linkMembers = links.filter(link => link.source.groupID.includes(groupID) || link.target.groupID.includes(groupID));

    //convert the links back
    linkMembers = linkMembers.map(obj => ({
      source: obj.source.id,
      target: obj.target.id}
      ))

      const storedGraphdata = {
        nodes: nodeMembers,
        links: linkMembers
      }

      //selectedNodes = nodeMembers;
      const newNode = handleMergeCommunitiesP(nodeMembers);
      newNode.storedGraphdata = storedGraphdata;
  }

  const handleExpandGroup = () =>{
    const storedData = selectedNode.storedGraphdata;
    if (!storedData)
      return;

      /*let { nodes, links } = graphData;
      //convert the links back
      links = links.map(obj => ({
      source: obj.source.id,
      target: obj.target.id}
      ))*/

      handleSplitCommunity(storedData)

  }

  function calculateCentroid(pts) {
    //console.log(pts)
    let firstPoint = pts[0], lastPoint = pts[pts.length - 1];
  if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) pts.push(firstPoint);
  let twiceArea = 0,
      x = 0, y = 0,
      nPts = pts.length,
      p1, p2, f;
  
  for (let i = 0, j = nPts - 1; i < nPts; j = i++) {
    p1 = pts[i]; p2 = pts[j];
    f = p1[0] * p2[1] - p2[0] * p1[1];
    twiceArea += f;          
    x += (p1[0] + p2[0]) * f;
    y += (p1[1] + p2[1]) * f;
  }
  f = twiceArea * 3;
  return [x / f, y / f];
}

  function drawHullOnCanvas(points, ctx, color, stretchFactor=1.5) {
    points = JSON.parse(JSON.stringify(points)); //deepcopy
    if (points.length < 3 || !points[0])
    return;
    //console.log(color)
    // Compute the convex hull
    //let hull = d3.polygonHull(points);
    //console.log(`HERE ${points}`)
    let hullIndices = convexHull(points);
    
    
    let hull = hullIndices.map(edge => {
      // edge is a pair of indices, like [0, 1]
      return points[edge[0]]//[points[edge[0]], points[edge[1]]];
    });

    //console.log(hull)


    // Compute the centroid of the convex hull
    //const centroid = d3.polygonCentroid(hull);
    const centroid = calculateCentroid(hull);
    //console.log(centroid)
    //console.log(centroid)
  
    // Create a new hull array with points moved away from the centroid
    const expandedHull = hull.map(point => {
      const vector = [point[0] - centroid[0], point[1] - centroid[1]];
      //console.log(`${point} ${vector} ${centroid}`)
      return [centroid[0] + vector[0] * stretchFactor, centroid[1] + vector[1] * stretchFactor];
    });

    

    hull = expandedHull
    // Add first point at the end to close the loop for Bezier curves
  hull.push(hull[0]);
  
    ctx.beginPath();
    for (let i = 0; i < hull.length; i++) {
        const startPt = hull[i];
        const endPt = hull[(i + 1) % hull.length];
        const midPt = [(startPt[0] + endPt[0]) / 2, (startPt[1] + endPt[1]) / 2];

        if (i === 0) {
        // Move to the first midpoint
        ctx.moveTo(midPt[0], midPt[1]);
        } else {
        // Draw quadratic Bezier curve from previous midpoint
        const prevMidPt = [(hull[i - 1][0] + startPt[0]) / 2, (hull[i - 1][1] + startPt[1]) / 2];
        ctx.quadraticCurveTo(startPt[0], startPt[1], midPt[0], midPt[1]);
        }
    }

    // Close the path for the last curve
    const lastMidPt = [(hull[hull.length - 1][0] + hull[0][0]) / 2, (hull[hull.length - 1][1] + hull[0][1]) / 2];
    ctx.quadraticCurveTo(hull[0][0], hull[0][1], lastMidPt[0], lastMidPt[1]);

    ctx.closePath();

    // Set the style for the dashed line
    ctx.setLineDash([5, 5]); // Sets up the dash pattern, adjust the numbers for different patterns
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)'; // Color for the dashed line
    ctx.lineWidth = 1; // Width of the dashed line
    ctx.stroke(); // Apply the line style to the hull

    ctx.fillStyle = color//'rgba(150, 150, 250, 0.1)'; // Fill color
    ctx.fill();

    // Reset the dashed line to default for any subsequent drawing
    ctx.setLineDash([]);

    return centroid;
  }

  const handleDownload = () =>{
    const fileName = window.prompt('Enter file name', 'myImage.png');

    if (fileName){
    const data = [];
    graphData.nodes.forEach(node=>{
      data.push(node.members);
    })

    console.log("NODES:",graphData.nodes)

    let text = JSON.stringify(data);

      const link = document.createElement('a');
      link.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    }


    if (false) {
      //let text = undoState;
      const nlinks = graphData.links.map(obj => ({
        source: obj.source.id,
        target: obj.target.id}
        ))
  
      const sGraphData = {
        nodes:graphData.nodes,
        links:nlinks
      }
  
      const undo = {
        graphData:sGraphData,
        orgCommunities,
        isEmpty,
        selectedNode,
        selectedNodes,
        multiSelect,
        allGroups
      }
  
      let text = JSON.stringify(undo);

      const link = document.createElement('a');
      link.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  const handleFileChange = (event) => {
    const fileReader = new FileReader();
    fileReader.readAsText(event.target.files[0], "UTF-8");

    fileReader.onload = e => {
      try {
        //const parsedJson = JSON.parse(e.target.result);
        //setJsonData(parsedJson);
        handleUndo(e.target.result);
      } catch (error) {
        console.error("Error parsing JSON:", error);
      }
    };
  };
  
  const handleButtonClick = () => {
    document.getElementById('jsonFileInput').click();
  };

  const handleUpdateMatrix = () => {
    if (selectedNodes.length <= 0)
      return;

    const allmembers = selectedNodes.map(obj => obj.members).flat();
    //console.log(allmembers)
    let filteredPixels = pixelData.filter(pair => {
        return allmembers.includes(pair[0]) && allmembers.includes(pair[1]);
    });

    let indexMapping = {},RindexMapping = {};
    allmembers.forEach((val, idx) => {
        indexMapping[val] = idx + 1;
        RindexMapping[idx+1]=val;
    });

    // Now, filter and remap the giant array
    let remappedArray = filteredPixels
    .filter(pair => allmembers.includes(pair[0]) && allmembers.includes(pair[1]))
    .map(pair => [indexMapping[pair[0]], indexMapping[pair[1]],pair[2]]);

    setPixelMapData(RindexMapping)
    setPixelData(remappedArray)
  }
  

  return (
    <div>
      <button
          onClick={() => handleStart()}
          disabled={multiSelect}
        >
        Start
        </button>
      
        <button
        onClick={handleMergeCommunities}
        disabled={!multiSelect || selectedNodes.length <= 1}
        >
        Merge
        </button>

        <button
        onClick={() => handleSplitCommunity()}
        disabled={multiSelect}
        >
        Split
        </button>

        <button
        onClick={() => handleCollaspeGroup()}
        disabled={multiSelect}
        >
        Collasp Group
        </button>


        <button
        onClick={() => handleExpandGroup()}
        disabled={multiSelect}
        >
        Expand Group
        </button>

        <button
        onClick={() => handleUpdateMatrix()}
    
        >
        Update Matrix
        </button>


        <button
        onClick={() => handleUndo()}
        >
        Undo
        </button>
        <button
        onClick={() => handleDownload()}
        >
        💾
        </button>

        <button
        onClick={() => handleButtonClick()}
        >
        📁
        </button>

        <input
        type="file"
        id="jsonFileInput"
        style={{ display: 'none' }}
        accept=".json"
        onChange={handleFileChange}
      />
<label>
      
      <input
        type="checkbox"
        checked={use3D}
        onChange={(e) => {
          setUse3D(e.target.checked);
        }}
      />
      Use3D
    </label>
<label>
      
        <input
          type="checkbox"
          checked={multiSelect}
          onChange={(e) => {
            setMultiSelect(e.target.checked);
            if (!e.target.checked) {
              setSelectedNodes([]); // Clear selected nodes when multi-select is turned off
            }
          }}
        />
        Multi select
      </label>
        <br/>
        <div>
      <label>
        Algorithm:
        <select value={algorithm} onChange={(e) => setAlgorithm(e.target.value)}>
          <option value="Louvain">Louvain</option>
          <option value="Infomap">Infomap</option>
          <option value="Label Propagation">Label Propagation</option>
          <option value="Hamming Distance">Hamming Distance</option>
          <option value="Selected">Selected</option>
        </select>
      </label>
      {renderInputs()}
      <label>
    Node Scale:
    <input defaultValue={nodeScale} style={{ maxWidth: '45px' }} type="number" onChange={(e)=>{setNodeScale(Number(e.target.value));}} />
  </label>
    </div>
    <br/>
      {/* Optional: Display the list of selected node IDs */}
      {multiSelect && selectedNodes.length > 0 && (
        <div>
          Selected Nodes:
          <ul>
            {selectedNodes.map((node, index) => (
              <li key={index}>Community {node.id}: {node.members.length} Members</li>
            ))}
          </ul>
        </div>
      )}
    {!use3D && (<ForceGraph2D
      graphData={graphData}
      nodeLabel="id"
      ref={fgRef}
      //cooldownTicks={100}
      //onEngineStop={() => fgRef.current.zoomToFit(400)}
      onNodeClick={(node) => {
        if (multiSelect) {
            setSelectedNodes(prevSelectedNodes => {
              // Add node to the array if it's not already included
              const isNodeAlreadySelected = prevSelectedNodes.find(selectedNode => selectedNode.id === node.id);
              if (!isNodeAlreadySelected) {
                //console.log(`Added Community Node: ${node.id}`);
                //console.log('Selected:', selectedNodes);
                const newState = [...prevSelectedNodes, node];
                let selected = []
                newState.forEach(node=>{
                    node.members.forEach(idx=>{
                        let seg = segments[parseInt(idx)];
                        seg.color = node.color;
                        selected.push(seg)
                    })
                })
                setSegmentsSelected(selected)
                return newState;
              }
              return prevSelectedNodes;
            });
          } else {
                setSelectedNodes([])
                if (selectedNode == node){
                    setSelectedNode(false)
                    setSegmentsSelected(segments)
                }else{
                    let selected = []
                    //console.log(segments.length)
                    node.members.forEach(idx=>{
                        let seg = segments[parseInt(idx)];
                        if (!seg)
                            console.log(`segment idx not found! ${idx}`)
                        seg.color = node.color;
                        selected.push(seg)
                    })
            
                    setSegmentsSelected(selected)
                    setSelectedNode(node)
                }
            }
        
      }}
      nodeCanvasObject={(node, ctx, globalScale) => {


        const label = node.id.toString();
        
        const fontSize = 12/globalScale; // Adjust font size against zoom level
        let size = node.size/nodeScale;

        // Draw group background or outline if the node has a groupID
        if(node.groupID.length > 0 && node.x) {
            //size *= 1.5;
            //var groupID = ;
            node.groupID.forEach(groupID =>{
              if (!window.tempt)
                window.tempt = {}
              if (!window.tempt[groupID])
                  window.tempt[groupID] = []
              window.tempt[groupID].push([node.x, node.y])
              //console.log(node)
              //console.log(JSON.stringify(node));
              //console.log({...node}.x)
              if (window.tempt[groupID].length == allGroups[groupID]){
                
                const centroid = drawHullOnCanvas(window.tempt[groupID], ctx, node.groupColor);
                window.tempt[groupID] = false;

                if (centroid){

                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';
                  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                  ctx.font = `${fontSize}px Sans-Serif`;
                  ctx.fillText((groupID-1).toString(), centroid[0], centroid[1]);
                }
            }
          })

        //console.log("here")
          // You can add custom logic to determine the color or shape based on groupID
          /*
          const backgroundPadding = 1; // Add some padding around the node
          const outlineSize = size + backgroundPadding; // The size of the outline/background
      
          ctx.setLineDash([1, 3]); // Create dashed lines with pattern [dashSize, gapSize]
            ctx.strokeStyle = node.groupColor; // Color of the dashed outline
            ctx.lineWidth = 2; // Width of the outline
            ctx.beginPath();
            ctx.arc(node.x, node.y, size, 0, Math.PI * 2, false);
            ctx.stroke();
            ctx.setLineDash([]); // Reset the dash pattern so it doesn't affect other drawings
            */
        }
      
        // Now draw the actual node on top
        
        //ctx.fillStyle = node.color || 'rgba(0, 0, 0, 1)';

        // Assuming node.color is a hex color like "#RRGGBB"
        const hexColor = node.color;
        let alpha = 0.4; // 50% transparency
        if (selectedNode){
          if (selectedNode.id == node.id)
            alpha = 1;
        }else if (selectedNodes.length > 0){
          if (selectedNodes.map(node => node.id).includes(node.id))
            alpha = 1;
        }else { //nothing is selected
          alpha = 1;
        }

        // Parse the hex color into RGB components
        const r = parseInt(hexColor.slice(1, 3), 16);
        const g = parseInt(hexColor.slice(3, 5), 16);
        const b = parseInt(hexColor.slice(5, 7), 16);

        // Set the fillStyle with RGBA format
        
        /*
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;

        ctx.beginPath();
        ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false); // Use size for radius
        //console.log(node.x, node.y)
        ctx.fill();
        */
       
        var x = node.x; // x coordinate of the circle's center
        var y = node.y; // y coordinate of the circle's center

        if (x === undefined || y === undefined){
          console.log("INVALID NODE XY: ", x,y);
          return;
        }

        if (!size){
          console.log("INVALID NODE SIZE: ", size);
          return;
        }

        //shadow
        ctx.fillStyle = 'rgba(200, 200, 200, 0.7)';
                
       

        var innerRadius = 0; // Radius of the inner circle (start of the gradient)
        var outerRadius = size; // Radius of the outer circle (end of the gradient)

         // Draw the shadow
         ctx.beginPath();
         ctx.arc(x+1, y+1, outerRadius, 0, 2 * Math.PI, false);
         ctx.fill();
         //--
        
        // Create gradient
        var gradient = ctx.createRadialGradient(x, y, innerRadius, x, y, outerRadius);
        //gradient.addColorStop(1, 'rgba(255, 255, 255, 1)'); // Start color: white
        gradient.addColorStop(0, `rgba(${r*3}, ${g*3}, ${b*3}, ${alpha})`);
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, ${alpha})`); 
        
        // Set the gradient as fill style
        ctx.fillStyle = gradient;
        
        // Draw the circle
        ctx.beginPath();
        ctx.arc(x, y, outerRadius, 0, 2 * Math.PI, false);
        ctx.fill();

        //console.log(outerRadius,gradient)

        let scolor = `rgba(${1}, ${1}, ${1}, ${alpha})`;
        if (node.groupColor){
          scolor = node.groupColor;
          const r2 = parseInt(node.groupColor.slice(1, 3), 16);
        const g2 = parseInt(node.groupColor.slice(3, 5), 16);
        const b2 = parseInt(node.groupColor.slice(5, 7), 16);

          //scolor = `rgba(${r2}, ${g2}, ${b2}, ${1})`;
          //alert(scolor)
        }

        ctx.strokeStyle = scolor
        
        //ctx.strokeStyle = node.groupColor; // Color for the dashed line
        ctx.lineWidth = 0.4; // Width of the dashed line
        ctx.stroke(); // Apply the line style to the hull
        
        //ctx.strokeStyle = 'black';
      
        // Draw labels for larger nodes
        if (size > 5/globalScale) {
          let fontSize_ = Math.round(fontSize+size/globalScale);
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = 'black';//`rgba(255, 255, 255, ${alpha*2})`;
          ctx.font = `${fontSize_}px Sans-Serif`;
          ctx.fillText(label, node.x, node.y);
          //ctx.fillText(size.toString(), node.x, node.y);
        }
      }}
      linkDirectionalArrowLength={2.5}
        linkDirectionalArrowRelPos={0.6}
        linkDirectionalArrowColor={'black'}
        linkCurvature={0.25}
        linkOpacity={1}
        linkColor = {'black'}
        linkWidth={4}
        d3Force="charge" // Modify the charge force
        d3ReheatSimulation={true}
        //d3AlphaDecay={0.0228} // Can tweak this for simulation cooling rate
        //d3VelocityDecay={0.4} // Can tweak this to adjust node movement inertia
        d3ForceConfig={{
            charge: { 
              strength: -220, 
              distanceMax: 300, // Optional: Increase to allow repulsion over larger distances
              //distanceMin: 1    // Optional: Decrease to enhance repulsion for closely positioned nodes
            },
            link: {
              // Adjust the strength of the link force based on groupID
              strength: (link) => {
                const sourceNode = graphData.nodes[link.source];
                const targetNode = graphData.nodes[link.target];
                alert("HERE")
                return sourceNode.groupID === targetNode.groupID ? 1 : 4; // Modify as needed
              },
              // You can also configure other link force parameters here
            }
        }}
    />)}




{use3D && (<ForceGraph3D
      graphData={graphData}
      nodeLabel="id"
      ref={fgRef}
      onNodeClick={(node) => {
        if (multiSelect) {
            setSelectedNodes(prevSelectedNodes => {
              // Add node to the array if it's not already included
              const isNodeAlreadySelected = prevSelectedNodes.find(selectedNode => selectedNode.id === node.id);
              if (!isNodeAlreadySelected) {
                //console.log(`Added Community Node: ${node.id}`);
                //console.log('Selected:', selectedNodes);
                const newState = [...prevSelectedNodes, node];
                let selected = []
                newState.forEach(node=>{
                    node.members.forEach(idx=>{
                        let seg = segments[parseInt(idx)];
                        seg.color = node.color;
                        selected.push(seg)
                    })
                })
                setSegmentsSelected(selected)
                return newState;
              }
              return prevSelectedNodes;
            });
          } else {
                setSelectedNodes([])
                if (selectedNode == node){
                    setSelectedNode(false)
                    setSegmentsSelected(segments)
                }else{
                    let selected = []
                    //console.log(segments.length)
                    node.members.forEach(idx=>{
                        let seg = segments[parseInt(idx)];
                        if (!seg)
                            console.log(`segment idx not found! ${idx}`)
                        seg.color = node.color;
                        selected.push(seg)
                    })
            
                    setSegmentsSelected(selected)
                    setSelectedNode(node)
                }
            }
        
      }}
      nodeCanvasObject={(node, ctx, globalScale) => {
        const label = node.id.toString();
        
        const fontSize = 12/globalScale; // Adjust font size against zoom level
        let size = node.size/nodeScale;

        // Draw group background or outline if the node has a groupID
        if(node.groupID.length > 0 && node.x) {
            //size *= 1.5;
            //var groupID = ;
            node.groupID.forEach(groupID =>{
              if (!window.tempt)
                window.tempt = {}
              if (!window.tempt[groupID])
                  window.tempt[groupID] = []
              window.tempt[groupID].push([node.x, node.y])
              //console.log(node)
              //console.log(JSON.stringify(node));
              //console.log({...node}.x)
              if (window.tempt[groupID].length == allGroups[groupID]){
                
                const centroid = drawHullOnCanvas(window.tempt[groupID], ctx, node.groupColor);
                window.tempt[groupID] = false;

                if (centroid){

                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';
                  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                  ctx.font = `${fontSize}px Sans-Serif`;
                  ctx.fillText((groupID-1).toString(), centroid[0], centroid[1]);
                }
            }
          })

        //console.log("here")
          // You can add custom logic to determine the color or shape based on groupID
          /*
          const backgroundPadding = 1; // Add some padding around the node
          const outlineSize = size + backgroundPadding; // The size of the outline/background
      
          ctx.setLineDash([1, 3]); // Create dashed lines with pattern [dashSize, gapSize]
            ctx.strokeStyle = node.groupColor; // Color of the dashed outline
            ctx.lineWidth = 2; // Width of the outline
            ctx.beginPath();
            ctx.arc(node.x, node.y, size, 0, Math.PI * 2, false);
            ctx.stroke();
            ctx.setLineDash([]); // Reset the dash pattern so it doesn't affect other drawings
            */
        }
      
        // Now draw the actual node on top
        
        //ctx.fillStyle = node.color || 'rgba(0, 0, 0, 1)';

        // Assuming node.color is a hex color like "#RRGGBB"
        const hexColor = node.color;
        let alpha = 0.5; // 50% transparency
        if (selectedNode){
          if (selectedNode.id == node.id)
            alpha = 1;
        }else if (selectedNodes.length > 0){
          if (selectedNodes.map(node => node.id).includes(node.id))
            alpha = 1;
        }else { //nothing is selected
          alpha = 1;
        }

        // Parse the hex color into RGB components
        const r = parseInt(hexColor.slice(1, 3), 16);
        const g = parseInt(hexColor.slice(3, 5), 16);
        const b = parseInt(hexColor.slice(5, 7), 16);

        // Set the fillStyle with RGBA format
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;

        ctx.beginPath();
        ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false); // Use size for radius
        //console.log(node.x, node.y)
        ctx.fill();

        let scolor = `rgba(${1}, ${1}, ${1}, ${1})`;
        if (node.groupColor){
          scolor = node.groupColor;
          const r2 = parseInt(node.groupColor.slice(1, 3), 16);
        const g2 = parseInt(node.groupColor.slice(3, 5), 16);
        const b2 = parseInt(node.groupColor.slice(5, 7), 16);

          //scolor = `rgba(${r2}, ${g2}, ${b2}, ${1})`;
          //alert(scolor)
        }

        ctx.strokeStyle = scolor
        
        //ctx.strokeStyle = node.groupColor; // Color for the dashed line
        ctx.lineWidth = 1; // Width of the dashed line
        ctx.stroke(); // Apply the line style to the hull
        
      
        // Draw labels for larger nodes
        if (size > 5/globalScale) {
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.font = `${fontSize}px Sans-Serif`;
          ctx.fillText(label, node.x, node.y);
        }
      }}
      linkDirectionalArrowLength={3.5}
        linkDirectionalArrowRelPos={1}
        d3Force="charge" // Modify the charge force
        d3ReheatSimulation={true}
        //d3AlphaDecay={0.0228} // Can tweak this for simulation cooling rate
        //d3VelocityDecay={0.4} // Can tweak this to adjust node movement inertia
        d3ForceConfig={{
            charge: { 
              strength: -220, 
              distanceMax: 300, // Optional: Increase to allow repulsion over larger distances
              //distanceMin: 1    // Optional: Decrease to enhance repulsion for closely positioned nodes
            },
            link: {
              // Adjust the strength of the link force based on groupID
              strength: (link) => {
                const sourceNode = graphData.nodes[link.source];
                const targetNode = graphData.nodes[link.target];
                alert("HERE")
                return sourceNode.groupID === targetNode.groupID ? 1 : 4; // Modify as needed
              },
              // You can also configure other link force parameters here
            }
        }}
    />)}
    
      
    </div>
  );
};

export default GraphCommunities;


/*non beizer backup
  function drawDashedHullOnCanvas(points, ctx) {
  // Compute the convex hull
  const hull = d3.polygonHull(points);

  // If no hull is found, or it's degenerate, don't draw anything
  if (!hull || hull.length < 3) return;

  // Begin path for the convex hull
  ctx.beginPath();
  ctx.moveTo(hull[0][0], hull[0][1]); // Start at the first point of the hull

  // Draw lines to the rest of the points on the hull
  for (let i = 1; i < hull.length; i++) {
    ctx.lineTo(hull[i][0], hull[i][1]);
  }

  ctx.closePath(); // Close the path to create a closed shape

  // Set the style for the dashed line
  ctx.setLineDash([5, 5]); // Sets up the dash pattern, adjust the numbers for different patterns
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)'; // Color for the dashed line
  ctx.lineWidth = 2; // Width of the dashed line
  ctx.stroke(); // Apply the line style to the hull

  // Fill the convex hull
  ctx.fillStyle = 'rgba(150, 150, 250, 0.5)'; // Fill color with some transparency
  ctx.fill(); // Fill the shape with the style set above

  // Reset the dashed line to default for any subsequent drawing
  ctx.setLineDash([]);
}*/