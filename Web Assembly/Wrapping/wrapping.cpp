#include "bits/stdc++.h"
#include <emscripten.h>
using namespace std;

extern "C"
{
    EMSCRIPTEN_KEEPALIVE
    int addNums(int a, int b)
    {
        return a + b;
    }

    EMSCRIPTEN_KEEPALIVE
    int subtractNums(int a, int b)
    {
        return a - b;
    }
}

EMSCRIPTEN_KEEPALIVE
int main()
{
    cout << "Hello World!" << endl;
    return 0;
}