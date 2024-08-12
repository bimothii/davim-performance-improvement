#include "kdtree.hpp"
#include <emscripten.h>
#include <bits/stdc++.h>
using namespace std;
using namespace Kdtree;

KdTree *tree;

int main()
{
    return 0;
}

extern "C"
{
    EMSCRIPTEN_KEEPALIVE
    void createTree(float *array, int length)
    {
        delete tree;
        KdNodeVector nodes;
        for (int i = 0; i < length; i += 3)
        {
            vector<double> point(3);
            point[0] = array[i];
            point[1] = array[i + 1];
            point[2] = array[i + 2];
            nodes.push_back(KdNode(point));
        }
        tree = new KdTree(&nodes);
    }

    EMSCRIPTEN_KEEPALIVE
    void knn(float *array, int length, int k)
    {
        for (int i = 0; i < length; i += 3)
        {
            KdNodeVector result;
            tree->k_nearest_neighbors(vector<double>{array[i], array[i + 1], array[i + 2]}, k, &result);
        }
    }

    EMSCRIPTEN_KEEPALIVE
    void *__malloc(size_t size)
    {
        return malloc(size);
    }

    EMSCRIPTEN_KEEPALIVE
    void __free(void *ptr)
    {
        free(ptr);
    }
}
