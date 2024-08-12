#include <emscripten.h>

extern "C"
{
    EMSCRIPTEN_KEEPALIVE
    int countTo(int num)
    {
        int a = 0;
        for (int i = 0; i < num; i++)
            a++;
        return a;
    }
}
