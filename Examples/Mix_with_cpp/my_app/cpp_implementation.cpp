#include "c_interface.h"

#include "external.h"

extern "C" void foo()
{
    foo_external();
}
