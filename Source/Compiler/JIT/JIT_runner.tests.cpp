#include <chrono>
#include <filesystem>
#include <string_view>
#include <thread>

#include <llvm/Analysis/CGSCCPassManager.h>
#include <llvm/Analysis/LoopAnalysisManager.h>
#include <llvm/IR/LLVMContext.h>
#include <llvm/IR/Module.h>
#include <llvm/IR/PassInstrumentation.h>
#include <llvm/IR/PassManager.h>
#include <llvm/Passes/StandardInstrumentations.h>
#include <llvm/Target/TargetMachine.h>

#include <llvm/ExecutionEngine/Orc/Core.h>
#include <llvm/ExecutionEngine/Orc/Shared/ExecutorSymbolDef.h>
#include <llvm/Support/Error.h>

#include <catch2/catch_all.hpp>

import h.common;
import h.compiler.artifact;
import h.compiler.jit_runner;

namespace h
{
    TEST_CASE("Run JIT and modify code")
    {
        std::filesystem::path const root_directory = std::filesystem::temp_directory_path() / "hlang_test" / "jit_modify_code";

        if (std::filesystem::exists(root_directory))
            std::filesystem::remove_all(root_directory);

        std::filesystem::create_directories(root_directory);

        std::filesystem::path const build_directory_path = root_directory / "build";
        std::filesystem::create_directories(build_directory_path);

        h::compiler::Artifact const artifact
        {
            .name = "hlang_artifact.json",
            .version = {
                .major = 0,
                .minor = 1,
                .patch = 0
            },
            .type = h::compiler::Artifact_type::Executable,
            .info = h::compiler::Executable_info
            {
                .source = "main.hltxt",
                .entry_point = "main",
                .include = {
                    "./**/*.hltxt"
                }
            }
        };

        std::filesystem::path const artifact_configuration_file_path = root_directory / "hlang_artifact.json";
        h::compiler::write_artifact_to_file(artifact, artifact_configuration_file_path);

        std::filesystem::path const main_file_path = root_directory / "main.hltxt";

        // TODO change module name to test.main
        std::string_view const initial_code = R"(    
            module test;

            function get_result() -> (result: Int32)
            {
                return 10;
            }

            export function main() -> (result: Int32)
            {
                return get_result();
            }
        )";
        h::common::write_to_file(main_file_path, initial_code);

        std::unique_ptr<h::compiler::JIT_runner> jit_runner = h::compiler::setup_jit_and_watch(artifact_configuration_file_path, {}, build_directory_path);

        int(*function_pointer)() = h::compiler::get_function<int(*)()>(*jit_runner, "test", "main");
        REQUIRE(function_pointer != nullptr);

        int const first_result = function_pointer();
        CHECK(first_result == 10);

        std::string_view const new_code = R"(            
            module test;

            function get_result() -> (result: Int32)
            {
                return 20;
            }

            export function main() -> (result: Int32)
            {
                return get_result();
            }
        )";
        h::common::write_to_file(main_file_path, new_code);

        using namespace std::chrono_literals;
        std::this_thread::sleep_for(1s);

        int const second_result = function_pointer();
        CHECK(second_result == 20);
    }
}
