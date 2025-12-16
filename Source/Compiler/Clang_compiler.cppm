module;

#include <clang/Frontend/CompilerInstance.h>

#include <filesystem>
#include <memory_resource>
#include <optional>
#include <span>
#include <string>
#include <vector>

export module h.compiler.clang_compiler;

namespace h::compiler
{
    export std::filesystem::path find_clang(bool const use_clang_cl);

    export bool compile_cpp(
        clang::CompilerInstance& clang_compiler_instance,
        std::string_view const target_triple,
        std::filesystem::path const& source_file_path,
        std::filesystem::path const& output_file_path,
        std::optional<std::filesystem::path> const output_dependency_file_path,
        std::span<std::pmr::string const> const include_directories,
        std::span<std::pmr::string const> const additional_flags,
        bool const use_clang_cl,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    );

    export std::pmr::vector<std::pmr::string> create_compile_cpp_arguments(
        std::filesystem::path const& clang_path,
        std::filesystem::path const& source_file_path,
        std::filesystem::path const& output_file_path,
        std::optional<std::filesystem::path> const output_dependency_file_path,
        std::span<std::pmr::string const> const include_directories,
        std::span<std::pmr::string const> const additional_flags,
        bool const use_clang_cl,
        std::pmr::polymorphic_allocator<> const& output_allocator
    );
}
