module;

#include <llvm/ADT/DenseMap.h>
#include <llvm/ExecutionEngine/Orc/SymbolStringPool.h>
#include <llvm/ExecutionEngine/Orc/Shared/ExecutorSymbolDef.h>
#include <llvm/Support/Error.h>

#include <filesystem>
#include <memory>
#include <span>
#include <shared_mutex>
#include <string_view>
#include <unordered_map>

export module h.compiler.jit_runner;

import h.compiler;
import h.compiler.artifact;
import h.compiler.file_watcher;
import h.compiler.jit_compiler;
import h.compiler.repository;
import h.parser;

namespace h::compiler
{
    struct JIT_runner_unprotected_data
    {
        std::filesystem::path build_directory_path;
        h::parser::Parser parser;
        std::unique_ptr<h::compiler::LLVM_data> llvm_data;
        std::unique_ptr<JIT_data> jit_data;
    };

    struct JIT_runner_protected_data
    {
        std::shared_mutex mutex;
        std::pmr::unordered_map<std::filesystem::path, Artifact> artifacts;
        std::pmr::unordered_map<std::pmr::string, std::filesystem::path> module_name_to_file_path;
        llvm::DenseMap<llvm::orc::SymbolStringPtr, std::pmr::string> symbol_to_module_name_map;
    };

    export struct JIT_runner
    {
        JIT_runner_unprotected_data unprotected_data;
        JIT_runner_protected_data protected_data;
        std::unique_ptr<File_watcher> file_watcher;

        ~JIT_runner();
    };

    export std::unique_ptr<JIT_runner> setup_jit_and_watch(
        std::filesystem::path const& artifact_configuration_file_path,
        std::span<std::filesystem::path const> repositories_file_paths,
        std::filesystem::path const& build_directory_path
    );

    std::optional<llvm::orc::ExecutorSymbolDef> get_function(
        JIT_runner& jit_runner,
        std::string_view module_name,
        std::string_view function_name
    );

    export
        template <typename Function_type>
    Function_type get_function(
        JIT_runner& jit_runner,
        std::string_view const module_name,
        std::string_view const function_name
    )
    {
        return get_function<Function_type>(*jit_runner.unprotected_data.jit_data, module_name, function_name);
    }
}
