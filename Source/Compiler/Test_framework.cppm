module;

#include <span>

export module h.compiler.test_framework;

import h.core;

namespace h::compiler
{
    export h::Module create_test_module(
        std::span<h::Module const> const core_modules
    );
}
