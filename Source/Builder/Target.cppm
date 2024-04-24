module;

#include <memory_resource>
#include <string>

export module h.builder.target;

namespace h::builder
{
    export struct Target
    {
        std::pmr::string operating_system;
    };

    export Target get_default_target();
}
