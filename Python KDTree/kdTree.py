class kdTree:
    def __init__(self, points, dimension=0):
        n = len(points)
        m = n // 2
        points.sort(key=lambda x: x[dimension])
        self.point = points[m]
        dimension = (dimension + 1) % len(points[0])
        if m > 0:
            self.left = kdTree(points[:m], dimension)
        if n - (m + 1) > 0:
            self.right = kdTree(points[m + 1 :], dimension)

    def rangeSearch(self, box):
        point = self.point
        if inbox(point, box):
            yield point
        yield from self.left.rangeSearch(box)
        yield from self.right.rangeSearch(box)


points = [(2, 3), (5, 4), (9, 6), (4, 7), (8, 1), (7, 2)]
tree = kdTree(points)
