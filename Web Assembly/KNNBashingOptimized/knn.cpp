#include <emscripten.h>
#include <vector>
using namespace std;

extern "C"
{
    EMSCRIPTEN_KEEPALIVE
    void knn(float *trainingPoints, float *testPoints, int numTraining, int numTest, int k)
    {
        for (int i = 0; i < numTest; i += 3)
        {
            vector<float> distances;
            for (int j = 0; j < numTraining; j += 3)
                distances.push_back(sqrt(pow(trainingPoints[j] - testPoints[i], 2) + pow(trainingPoints[j + 1] - testPoints[i + 1], 2) + pow(trainingPoints[j + 2] - testPoints[i + 2], 2)));
            sort(distances.begin(), distances.end());
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
