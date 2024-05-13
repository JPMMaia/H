module;

#include <memory_resource>
#include <string>

export module h.compiler.target;

namespace h::compiler
{
    export struct Target
    {
        std::pmr::string operating_system;
    };

    export Target get_default_target();
}
