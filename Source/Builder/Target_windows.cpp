module;

#include <memory_resource>
#include <string>

module h.builder.target;

namespace h::builder
{
    Target get_default_target()
    {
        return Target
        {
            .operating_system = "windows"
        };
    }
}
