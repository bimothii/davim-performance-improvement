#include "bits/stdc++.h"
#include <emscripten.h>

extern "C"
{
    EMSCRIPTEN_KEEPALIVE
    int sumOfNInts(int n)
    {
        return n * (n + 1) / 2;
    }
}