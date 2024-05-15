module;

#include <filesystem>
#include <memory_resource>
#include <string>
#include <unordered_map>

export module h.compiler.recompilation;

import h.core;
import h.parser;

namespace h::compiler
{
    export using Symbol_name_to_hash = std::pmr::unordered_map<std::pmr::string, std::uint64_t>;

    export Symbol_name_to_hash hash_export_interface(
        h::Module const& core_module,
        std::pmr::polymorphic_allocator<> const& output_allocator
    );

    export std::pmr::vector<std::pmr::string> find_modules_to_recompile(
        h::Module const& core_module,
        std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const& module_name_to_file_path,
        std::pmr::unordered_multimap<std::pmr::string, std::pmr::string> const& module_name_to_reverse_dependencies,
        std::pmr::unordered_map<std::pmr::string, Symbol_name_to_hash> const& module_name_to_symbol_hashes,
        h::parser::Parser const& parser,
        std::filesystem::path const& build_directory
    );
}
