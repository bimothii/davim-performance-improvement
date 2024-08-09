onmessage = (message) => {
  const points = message.data.points;
  const start = message.data.start;
  const end = message.data.end;
  const k = message.data.k;

  for (let i = start; i < end; i++) {
    const distances = [];
    for (let j = 0; j < points.length; j++) {
      distances.push({
        index: j,
        distance: Math.sqrt(
          Math.pow(points[i][0] - points[j][0], 2) +
            Math.pow(points[i][1] - points[j][1], 2)
        ),
      });
    }
    distances.sort((a, b) => {
      if (a.distance === b.distance) return a.index - b.index;
      return a.distance - b.distance;
    });
    postMessage({
      index: i,
      neighbors: distances.slice(1, k + 1).map((d) => {
        return d.index;
      }),
    });
  }
};
