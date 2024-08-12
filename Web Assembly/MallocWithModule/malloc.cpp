#include <emscripten.h>
#include <stdint.h>
#include <stdlib.h>

int main() { return 0; }

extern "C"
{
    EMSCRIPTEN_KEEPALIVE
    int accumulate(int *arr, int n)
    {
        int sum = 0;
        while (n)
        {
            sum += arr[--n];
        }
        return sum;
    }

    EMSCRIPTEN_KEEPALIVE
    const char *getString()
    {
        return "Hello, asdfasdfasdfasdf!";
    }

    EMSCRIPTEN_KEEPALIVE
    void processArray(uint8_t *array, int length)
    {
        for (int i = 0; i < length; ++i)
        {
            array[i] += 1;
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