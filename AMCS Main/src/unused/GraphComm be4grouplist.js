import React, { useEffect, useState } from 'react';
import { ForceGraph2D } from 'react-force-graph';
import Graph from 'graphology';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import louvain from 'graphology-communities-louvain';

import { scaleOrdinal } from 'd3-scale';
import { schemeCategory10 } from 'd3-scale-chromatic'; // Or any other D3 color scheme

//import * as d3 from 'd3';
import convexHull from 'convex-hull'
import chroma from 'chroma-js';

//import { node } from 'webpack';

// Use an ordinal scale for colors with a D3 color scheme
const colorScale = scaleOrdinal(schemeCategory10);

const GraphCommunities = ({ data, segments, setSegmentsSelected }) => {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [orgCommunities, setOrgCommunities] = useState({ nodes: [], links: [] });
  const [isEmpty, setIsEmpty] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);

  const [multiSelect, setMultiSelect] = useState(false);
    const [selectedNodes, setSelectedNodes] = useState([]);


  useEffect(() => {
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
  
      // Add nodes first
    data.forEach((_, nodeIndex) => {
        if (!graph.hasNode(nodeIndex)) {
        graph.addNode(nodeIndex);
        }
    });

    // Then add edges
    data.forEach((edges, source) => {
        edges.forEach(target => {
        // Ensure both source and target nodes exist
        if (!graph.hasNode(target)) {
            graph.addNode(target);
        }
        if (!graph.hasEdge(source, target)) {
            graph.addEdge(source, target);
        }
        });
    });
  
    // Detect communities
    const communities = louvain(graph);

    setOrgCommunities(communities);

    ///color all!!
    Object.entries(communities).forEach(([nodeId, communityIndex]) => {
        const color= colorScale(communityIndex.toString())
        //console.log(`Node ${nodeId}: Community ${communityIndex} Color: ${color}`);
        segments[parseInt(nodeId)].color = color;
        setSegmentsSelected(segments)
      });
  
    // Process communities, creating nodes for each community and counting sizes
    Object.entries(communities).forEach(([node, community]) => {
      if (!communityGraph.hasNode(community)) {
        communityGraph.addNode(community, { size: 1 });
      } else {
        communityGraph.updateNodeAttribute(community, 'size', size => size + 1);
      }
    });
  
    // Now, let's prepare data for visualization
    const nodes = communityGraph.nodes().map(node => ({
      id: node,
      size: communityGraph.getNodeAttribute(node, 'size'),
    }));

    // After computing community sizes but before setting the graphData:
    const scaleFactor = 0.02; // Adjust this scaling factor as needed
    const scaledNodes = nodes.map(node => ({
        ...node,
        size: node.size * scaleFactor,
    }));

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
        if (!communityMembers[communityId]) {
        communityMembers[communityId] = [];
        }
        communityMembers[communityId].push(parseInt(originalNode, 10));
    });

    const nodesWithCommunityMembers = nodesWithColors.map(node => ({
        ...node,
        members: communityMembers[node.id] || [],
        groupID: -1
    }));
    setGraphData({
      //nodes,
      nodes:nodesWithCommunityMembers,
      links: interCommunityLinks//[], // No inter-community links for this simplified visualization
    });
  
  }, [data]);
  
  

  if (isEmpty) {
    // If the graph is empty, we can return null or some placeholder
    return <div>No data available to plot the graph.</div>;
  }

  const handleMergeCommunities = () => {
        const toMerge = selectedNodes.map(node => node.id);
        let { nodes, links } = graphData;

        if (selectedNodes[0].groupID != -1){//already in group
            stop = false;
            const mGroupID = selectedNodes[0].groupID;
            selectedNodes.forEach(node => {
              if (node.groupID != mGroupID){
                stop = true;
                console.log(`${node.groupID} ${mGroupID}`)
                //console.log()
              }
            });
            if (stop){
              alert("cannot merge nodes from different groups!")
              return;
            }

            nodes.forEach(node => {
                if (node.groupID == mGroupID){
                    node.groupSize -= toMerge.length-1;
                    if (node.groupSize == 0)
                      node.groupID = -1;
                }
            });
        } 

        //console.log(orgCommunities)
        

        //conver the links back
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
            
        };
        nodes.push(newCommunityNode);

        // Update the links to reflect the merge
        console.log(toMerge)
        console.log(links[0])
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
            selected.push(seg)
        })
        setSegmentsSelected(selected)
        setSelectedNode(newCommunityNode)

        // Set the updated nodes and links to the state
        setGraphData({
            nodes: nodes,
            links: links,
        });
  }

  const handleSplitCommunity = () => {
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
    const communityNode = nodes.find(node => node.id === communityIndex);
    if (!communityNode) {
        console.error("Community to split not found");
        return;
    }

    if (communityNode.groupID != -1){//already in group
        nodes.forEach(node => {
            if (node.groupID == communityNode.groupID)
                node.groupSize -= 1;
        });
    } 

    // Calculate new community size, assume communityNode.members is an array of member IDs
    const totalMembers = communityNode.members.length;
    const membersPerNewCommunity = Math.ceil(totalMembers / X);
    
    // Remove the original community node
    nodes = nodes.filter(node => node.id !== communityIndex);
    communityNode.groupID=-1;

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

    const graph = new Graph(); // Create a graph
    const communityGraph = new Graph(); // This will store the community graph
    
    const indicesToFilter = communityNode.members;

    const fdata = indicesToFilter.map(index => data[index]);
      // Add nodes first
    fdata.forEach((_, nodeIndex) => {
        if (!graph.hasNode(indicesToFilter[nodeIndex])) {
            //console.log(nodeIndex)
            graph.addNode(indicesToFilter[nodeIndex]);
        }
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
    
  
    // Detect communities
    const communities = louvain(graph);

    

    //console.log(communities)
  
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
    let fnodes = communityGraph.nodes().map(node => ({
      id: node.toString(),
      size: (communityGraph.getNodeAttribute(node, 'size')/totalMembers)*orgSize,
      color: colorScale(node.toString()),
      groupID: maxCommunityIndex,
      groupColor: groupColorWithOpacity,//colorScale(maxCommunityIndex.toString()),
      groupSize: communityGraph.nodes().length
    }));

    // Detected communities: communities (a mapping of node -> community)

    let interCommunityLinks = [];

    // Assuming `data` is an adjacency list representation of the original graph
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
                console.log([sourceCommunity,targetCommunity,sourceCommunity.toString(), targetCommunity.toString()])
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

    

    //console.log(fnodes)
    fnodes = nodes.concat(fnodes)
    newLinks = newLinks.concat(interCommunityLinks)

    /////////

    // Set the updated nodes and links to the state
    setGraphData({
        nodes: fnodes,
        links: newLinks
        //links: newLinks,
    });
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

  

  return (
    <div>
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
    <ForceGraph2D
      graphData={graphData}
      nodeLabel="id"
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
        let size = node.size;

        // Draw group background or outline if the node has a groupID
        if(node.groupID !== -1 && node.x) {
            var groupID = node.groupID;
            size *= 1.5;
            if (!window.tempt)
                window.tempt = {}
            if (!window.tempt[groupID])
                window.tempt[groupID] = []
            window.tempt[groupID].push([node.x, node.y])
            //console.log(node)
            //console.log(JSON.stringify(node));
            //console.log({...node}.x)
            if (window.tempt[groupID].length == node.groupSize){
              
              drawHullOnCanvas(window.tempt[groupID], ctx, node.groupColor);
              window.tempt[groupID] = false;
                /*const centroid = drawHullOnCanvas(window.tempt[groupID], ctx, node.groupColor);
                window.tempt[groupID] = false;

                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                ctx.font = `${fontSize}px Sans-Serif`;
                ctx.fillText((groupID-1).toString(), centroid[0], centroid[1]);*/
            }
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
        
        ctx.fillStyle = node.color || 'rgba(0, 0, 0, 1)';
        ctx.beginPath();
        ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false); // Use size for radius
        //console.log(node.x, node.y)
        ctx.fill();
      
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
              //strength: -120, 
              //distanceMax: 200, // Optional: Increase to allow repulsion over larger distances
              //distanceMin: 1    // Optional: Decrease to enhance repulsion for closely positioned nodes
            }
        }}
    />
    
      
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