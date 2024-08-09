import { knn } from "../components/knnHelper";

onmessage = (message) => {
  const points = message.data.points;
  const tree = message.data.tree;
  const start = message.data.start;
  const end = message.data.end;
  const k = message.data.k;

  for (let i = start; i < end; i++) {
    postMessage({
      index: i,
      neighbors: knn(tree, points[i], k),
    });
  }
};
