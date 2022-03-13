module;

#include <nlohmann/json.hpp>

#include <format>
#include <memory_resource>
#include <string>
#include <vector>

module h.json_serializer;

import h.core;

namespace h
{
    Instruction_type to_instruction_type(nlohmann::json const& json)
    {
        std::string const& type = json.get<std::string>();

        if (type == "call")
        {
            return Instruction_type::Call;
        }
        else if (type == "empty")
        {
            return Instruction_type::Empty;
        }
        else if (type == "return")
        {
            return Instruction_type::Return;
        }

        throw std::runtime_error{ std::format("Instruction type {} not recognized!", type.c_str()) };
    }

    Instruction to_call_instruction(nlohmann::json const& json)
    {
        return
        {
            .type = Instruction_type::Call,
        };
    }

    Instruction to_empty_instruction(nlohmann::json const& json)
    {
        return
        {
            .type = Instruction_type::Empty,
        };
    }

    Instruction to_return_instruction(nlohmann::json const& json)
    {
        return
        {
            .type = Instruction_type::Return,
        };
    }

    Instruction to_instruction(nlohmann::json const& json)
    {
        Instruction_type const type = to_instruction_type(json.at("type"));

        switch (type)
        {
        case Instruction_type::Call:
            return to_call_instruction(json);
        case Instruction_type::Empty:
            return to_empty_instruction(json);
        case Instruction_type::Return:
            return to_return_instruction(json);
        }

        return {};
    }

    Procedure to_procedure(nlohmann::json const& json)
    {
        return {};
    }

    Module to_module(nlohmann::json const& json)
    {
        return {};
    }

    Entry_point to_entry_point(nlohmann::json const& json)
    {
        return {};
    }

    Executable to_executable(nlohmann::json const& json)
    {
        return {};
    }

    Project to_project(nlohmann::json const& json)
    {
        return {};
    }
}
