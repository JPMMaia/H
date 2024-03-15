module;

#include <llvm/IR/LLVMContext.h>
#include <llvm/IR/Module.h>
#include <llvm/Target/TargetMachine.h>

#include <filesystem>
#include <memory>
#include <memory_resource>
#include <string>
#include <unordered_map>

export module h.compiler;

import h.core;

namespace h::compiler
{
    export struct Struct_types
    {
        llvm::StructType* string;
    };

    export struct LLVM_data
    {
        std::string target_triple;
        llvm::Target const* target;
        llvm::TargetMachine* target_machine;
        llvm::DataLayout data_layout;
        std::unique_ptr<llvm::LLVMContext> context;
        Struct_types struct_types;
    };

    export struct LLVM_module_data
    {
        std::pmr::vector<Module> dependencies;
        std::unique_ptr<llvm::Module> module;
    };

    export LLVM_data initialize_llvm();

    export LLVM_module_data create_llvm_module(
        LLVM_data& llvm_data,
        Module const& core_module,
        std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const& module_name_to_file_path_map
    );

    export std::string to_string(
        llvm::Module const& llvm_module
    );

    export void write_to_file(
        LLVM_data const& llvm_data,
        LLVM_module_data const& llvm_module_data,
        std::filesystem::path const& output_file_path
    );

    export void generate_object_file(
        std::filesystem::path const& output_file_path,
        Module const& core_module,
        std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const& module_name_to_file_path_map
    );
}
