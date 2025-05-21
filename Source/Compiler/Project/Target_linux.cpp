module;

#include <memory_resource>
#include <string>

module h.compiler.target;

namespace h::compiler
{
    Target get_default_target()
    {
        return Target
        {
            .operating_system = "linux"
        };
    }
}
