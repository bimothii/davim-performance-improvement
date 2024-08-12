#include "kdtree.hpp"
#include <bits/stdc++.h>
#include <emscripten.h>
using namespace std;

Kdtree::KdNodeVector nodes;
Kdtree::KdTree *tree;

extern "C"
{
    EMSCRIPTEN_KEEPALIVE
    void addPoint(float x, float y, float z)
    {
        vector<double> point(3);
        point[0] = x;
        point[1] = y;
        point[2] = z;
        nodes.push_back(Kdtree::KdNode(point));
    }

    EMSCRIPTEN_KEEPALIVE
    void addPoints(int *arr, int length)
    {
        for (int i = 0; i < length; i += 3)
        {
            vector<double> point(3);
            point[0] = arr[i];
            point[1] = arr[i + 1];
            point[2] = arr[i + 2];
            nodes.push_back(Kdtree::KdNode(point));
        }
    }

    EMSCRIPTEN_KEEPALIVE
    void constructTree()
    {
        Kdtree::KdTree newTree(&nodes);
        tree = &newTree;
    }

    EMSCRIPTEN_KEEPALIVE
    void knn(double *arr, int k)
    {
        Kdtree::KdNodeVector result;
        tree->k_nearest_neighbors(vector<double>{arr[0], arr[1], arr[2]}, k, &result);
        for (Kdtree::KdNode node : result)
            cout << node.index << endl;
    }

    EMSCRIPTEN_KEEPALIVE
    void printPoints()
    {
        for (Kdtree::KdNode node : nodes)
            cout << to_string(node.point[0]) + " " + to_string(node.point[1]) + " " + to_string(node.point[2]) + "\n";
    }
}