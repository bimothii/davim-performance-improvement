export class KDNode {
  constructor(point, axis) {
    this.point = point;
    this.axis = axis;
    this.left = null;
    this.right = null;
  }
}

export const buildTree = (points, depth) => {
  if (points.length === 0) {
    return null;
  }

  const k = points[0].length;
  const axis = depth % k;

  points.sort((a, b) => a[axis] - b[axis]);
  const medianIndex = Math.floor(points.length / 2);
  const medianPoint = points[medianIndex];

  const node = new KDNode(medianPoint, axis);
  node.left = buildTree(points.slice(0, medianIndex), depth + 1);
  node.right = buildTree(points.slice(medianIndex + 1), depth + 1);

  return node;
};

export const knn = (tree, point, k) => {
  const best = { distance: Infinity, neighbors: [] };
  _knn(tree.root, point, k, best);
  return best.neighbors;
};

export const _knn = (node, point, k, best) => {
  if (node === undefined) {
    return;
  }
  const axis = node.axis;
  const distance = _distance(point, node.point);
  const [near, far] =
    point[axis] < node.point[axis]
      ? [node.left, node.right]
      : [node.right, node.left];

  _updateBest(distance, node.point, k, best);

  if (near !== null) {
    _knn(near, point, k, best);
  }

  const axisDist = Math.abs(point[axis] - node.point[axis]);
  if (axisDist < best.distance) {
    if (far !== null) {
      _knn(far, point, k, best);
    }
  }
};

export const _updateBest = (distance, point, k, best) => {
  if (best.neighbors.length < k) {
    best.neighbors.push({ point, distance });
    best.neighbors.sort((a, b) => a.distance - b.distance);
    best.distance = best.neighbors[k - 1].distance;
  } else if (distance < best.distance) {
    best.neighbors.pop();
    best.neighbors.push({ point, distance });
    best.neighbors.sort((a, b) => a.distance - b.distance);
    best.distance = best.neighbors[k - 1].distance;
  }
};

export const _distance = (a, b) => {
  return Math.sqrt(a.reduce((sum, ai, i) => sum + (ai - b[i]) ** 2, 0));
};
