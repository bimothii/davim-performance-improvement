#include "bits/stdc++.h"
#include <emscripten.h>

extern "C"
{
    EMSCRIPTEN_KEEPALIVE
    int add(int a, int b)
    {
        return a + b;
    }

    EMSCRIPTEN_KEEPALIVE
    int sub(int a, int b)
    {
        return a - b;
    }

    EMSCRIPTEN_KEEPALIVE
    int mul(int a, int b)
    {
        return a * b;
    }

    EMSCRIPTEN_KEEPALIVE
    int divv(int a, int b)
    {
        return a / b;
    }
}