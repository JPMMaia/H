module;

#include <nlohmann/json.hpp>

export module h.json_serializer;

import h.core;

namespace h
{
    export Instruction to_instruction(nlohmann::json const& json);

    export Procedure to_procedure(nlohmann::json const& json);

    export Module to_module(nlohmann::json const& json);

    export Entry_point to_entry_point(nlohmann::json const& json);

    export Executable to_executable(nlohmann::json const& json);

    export Project to_project(nlohmann::json const& json);
}
