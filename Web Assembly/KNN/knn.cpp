#include <emscripten.h>
#include <bits/stdc++.h>
#include "kdtree.hpp"
using namespace std;
using namespace Kdtree;

void print_nodes(const Kdtree::KdNodeVector &nodes)
{
    size_t i, j;
    for (i = 0; i < nodes.size(); ++i)
    {
        if (i > 0)
            cout << " ";
        cout << "(";
        for (j = 0; j < nodes[i].point.size(); j++)
        {
            if (j > 0)
                cout << ",";
            cout << nodes[i].point[j];
        }
        cout << ")";
    }
    cout << endl;
}

extern "C"
{
    EMSCRIPTEN_KEEPALIVE
    void run(float *points, float *queries, int *res, int numPoints, int numQueries, int k, int dimensions)
    {
        clock_t start = clock();
        KdNodeVector nodes;
        for (int i = 0; i < numPoints; i++)
        {
            vector<double> p;
            for (int j = 0; j < dimensions; j++)
                p.push_back(points[i * dimensions + j]);
            nodes.push_back(KdNode(p, NULL, i));
        }
        cout << "C++: Time to make nodes: " << (clock() - start) / (double)CLOCKS_PER_SEC * 1000 << endl;

        start = clock();
        KdTree tree(&nodes);
        cout << "C++: Time to create tree: " << (clock() - start) / (double)CLOCKS_PER_SEC * 1000 << endl;

        start = clock();

        for (int i = 0; i < numQueries; i++)
        {
            vector<double> p;
            for (int j = 0; j < dimensions; j++)
                p.push_back(queries[i * dimensions + j]);
            KdNodeVector result;
            tree.k_nearest_neighbors(p, k, &result);
            for (int j = 0; j < k; j++)
                res[i * k + j] = result[j].index;
        }
        cout << "C++: Time to query: " << (clock() - start) / (double)CLOCKS_PER_SEC * 1000 << endl;
        cout << "C++: Time per query: " << (clock() - start) / (double)CLOCKS_PER_SEC * 1000 / numQueries << endl;
    }

    EMSCRIPTEN_KEEPALIVE
    float *createFloatArray(int length)
    {
        return (float *)malloc(length * sizeof(float));
    }

    EMSCRIPTEN_KEEPALIVE
    int *createIntArray(int length)
    {
        return (int *)malloc(length * sizeof(int));
    }

    EMSCRIPTEN_KEEPALIVE
    void freeFloatArray(float *array)
    {
        free(array);
    }

    EMSCRIPTEN_KEEPALIVE
    void freeIntArray(int *array)
    {
        free(array);
    }
}