#include <memory_resource>
#include <filesystem>
#include <optional>
#include <string_view>
#include <unordered_map>

#include <catch2/catch_all.hpp>

import h.common;
import h.compiler.recompilation;
import h.core;
import h.json_serializer;
import h.parser;

namespace h
{
    std::filesystem::path setup_root_directory(
        std::string_view const directory_name
    )
    {
        std::filesystem::path const root_directory = std::filesystem::temp_directory_path() / "hlang_test" / directory_name;

        if (std::filesystem::exists(root_directory))
            std::filesystem::remove_all(root_directory);

        std::filesystem::create_directories(root_directory);

        return root_directory;
    }

    std::filesystem::path setup_build_directory(
        std::filesystem::path const& root_directory
    )
    {
        std::filesystem::path const build_directory_path = root_directory / "build";
        std::filesystem::create_directories(build_directory_path);
        return build_directory_path;
    }

    h::Module parse_core_module(
        h::parser::Parser const& parser,
        std::filesystem::path const& file_path,
        std::filesystem::path const& build_directory
    )
    {
        std::filesystem::path const parsed_file_path = build_directory / file_path.filename().replace_extension("hl");
        h::parser::parse(parser, file_path, parsed_file_path);

        std::optional<h::Module> core_module = h::json::read_module(parsed_file_path);
        REQUIRE(core_module.has_value());

        return *core_module;
    }

    TEST_CASE("Recompile modules that depend on changed export interface", "[Recompilation]")
    {
        std::filesystem::path const root_directory = setup_root_directory("recompilation_0");
        std::filesystem::path const build_directory_path = setup_build_directory(root_directory);
        h::parser::Parser const parser = h::parser::create_parser();

        std::filesystem::path const module_a_file_path = root_directory / "A.hltxt";
        std::string_view const module_a_code = R"(    
            module A;

            import B as B;

            export function main() -> (result: Int32)
            {
                var foo: B.Foo = {};
                return foo.a;
            }
        )";
        h::common::write_to_file(module_a_file_path, module_a_code);

        std::filesystem::path const module_b_file_path = root_directory / "B.hltxt";
        std::string_view const module_b_code = R"(    
            module B;

            export struct Foo
            {
                a: Int32 = 0;
            }
        )";
        h::common::write_to_file(module_b_file_path, module_b_code);

        std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path
        {
            std::make_pair("A", module_a_file_path),
            std::make_pair("B", module_b_file_path),
        };

        std::pmr::unordered_multimap<std::pmr::string, std::pmr::string> const module_name_to_reverse_dependencies
        {
            std::make_pair("B", "A"),
        };

        std::pmr::unordered_map<std::pmr::string, h::compiler::Symbol_name_to_hash> const module_name_to_symbol_hashes
        {
            std::make_pair("B", h::compiler::hash_export_interface(parse_core_module(parser, module_b_file_path, build_directory_path), {})),
        };

        std::string_view const new_module_b_code = R"(    
            module B;

            export struct Foo
            {
                a: Int32 = 1;
            }
        )";
        h::common::write_to_file(module_b_file_path, new_module_b_code);

        std::pmr::vector<std::pmr::string> const modules_to_recompile = h::compiler::find_modules_to_recompile(
            parse_core_module(parser, module_b_file_path, build_directory_path),
            module_name_to_file_path,
            module_name_to_reverse_dependencies,
            module_name_to_symbol_hashes,
            parser,
            build_directory_path,
            {},
            {}
        );

        std::pmr::vector<std::pmr::string> const expected_modules_to_recompile
        {
            "A"
        };

        CHECK(modules_to_recompile == expected_modules_to_recompile);
    }

    TEST_CASE("Do not recompile modules that do not depend on changed export interface", "[Recompilation]")
    {
        std::filesystem::path const root_directory = setup_root_directory("recompilation_1");
        std::filesystem::path const build_directory_path = setup_build_directory(root_directory);
        h::parser::Parser const parser = h::parser::create_parser();

        std::filesystem::path const module_a_file_path = root_directory / "A.hltxt";
        std::string_view const module_a_code = R"(    
            module A;

            import B as B;

            export function main() -> (result: Int32)
            {
                var foo: B.Foo = {};
                return foo.a;
            }
        )";
        h::common::write_to_file(module_a_file_path, module_a_code);

        std::filesystem::path const module_b_file_path = root_directory / "B.hltxt";
        std::string_view const module_b_code = R"(    
            module B;

            export struct Foo
            {
                a: Int32 = 0;
            }

            export struct Bar
            {
                a: Int32 = 0;
            }
        )";
        h::common::write_to_file(module_b_file_path, module_b_code);

        std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path
        {
            std::make_pair("A", module_a_file_path),
            std::make_pair("B", module_b_file_path),
        };

        std::pmr::unordered_multimap<std::pmr::string, std::pmr::string> const module_name_to_reverse_dependencies
        {
            std::make_pair("B", "A"),
        };

        std::pmr::unordered_map<std::pmr::string, h::compiler::Symbol_name_to_hash> const module_name_to_symbol_hashes
        {
            std::make_pair("B", h::compiler::hash_export_interface(parse_core_module(parser, module_b_file_path, build_directory_path), {})),
        };

        std::string_view const new_module_b_code = R"(    
            module B;

            export struct Foo
            {
                a: Int32 = 0;
            }

            export struct Bar
            {
                a: Int32 = 1;
            }
        )";
        h::common::write_to_file(module_b_file_path, new_module_b_code);

        std::pmr::vector<std::pmr::string> const modules_to_recompile = h::compiler::find_modules_to_recompile(
            parse_core_module(parser, module_b_file_path, build_directory_path),
            module_name_to_file_path,
            module_name_to_reverse_dependencies,
            module_name_to_symbol_hashes,
            parser,
            build_directory_path,
            {},
            {}
        );

        CHECK(modules_to_recompile.empty());
    }

    TEST_CASE("Recompile modules that depend on changed internal interface used by external", "[Recompilation]")
    {
        std::filesystem::path const root_directory = setup_root_directory("recompilation_2");
        std::filesystem::path const build_directory_path = setup_build_directory(root_directory);
        h::parser::Parser const parser = h::parser::create_parser();

        std::filesystem::path const module_a_file_path = root_directory / "A.hltxt";
        std::string_view const module_a_code = R"(    
            module A;

            import B as B;

            export function main() -> (result: Int32)
            {
                var foo: B.Foo = {};
                return foo.bar.a;
            }
        )";
        h::common::write_to_file(module_a_file_path, module_a_code);

        std::filesystem::path const module_b_file_path = root_directory / "B.hltxt";
        std::string_view const module_b_code = R"(    
            module B;

            export struct Foo
            {
                bar: Bar = {};
            }

            struct Bar
            {
                a: Int32 = 0;
            }
        )";
        h::common::write_to_file(module_b_file_path, module_b_code);

        std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path
        {
            std::make_pair("A", module_a_file_path),
            std::make_pair("B", module_b_file_path),
        };

        std::pmr::unordered_multimap<std::pmr::string, std::pmr::string> const module_name_to_reverse_dependencies
        {
            std::make_pair("B", "A"),
        };

        std::pmr::unordered_map<std::pmr::string, h::compiler::Symbol_name_to_hash> const module_name_to_symbol_hashes
        {
            std::make_pair("B", h::compiler::hash_export_interface(parse_core_module(parser, module_b_file_path, build_directory_path), {})),
        };

        std::string_view const new_module_b_code = R"(    
            module B;

            export struct Foo
            {
                bar: Bar = {};
            }

            struct Bar
            {
                a: Int32 = 1;
            }
        )";
        h::common::write_to_file(module_b_file_path, new_module_b_code);

        std::pmr::vector<std::pmr::string> const modules_to_recompile = h::compiler::find_modules_to_recompile(
            parse_core_module(parser, module_b_file_path, build_directory_path),
            module_name_to_file_path,
            module_name_to_reverse_dependencies,
            module_name_to_symbol_hashes,
            parser,
            build_directory_path,
            {},
            {}
        );

        std::pmr::vector<std::pmr::string> const expected_modules_to_recompile
        {
            "A"
        };

        CHECK(modules_to_recompile == expected_modules_to_recompile);
    }

    TEST_CASE("Recompile modules that depend on changed export interface and propagate changes", "[Recompilation]")
    {
        std::filesystem::path const root_directory = setup_root_directory("recompilation_3");
        std::filesystem::path const build_directory_path = setup_build_directory(root_directory);
        h::parser::Parser const parser = h::parser::create_parser();

        std::filesystem::path const module_a_file_path = root_directory / "A.hltxt";
        std::string_view const module_a_code = R"(    
            module A;

            import B as B;

            export function main() -> (result: Int32)
            {
                var foo: B.Foo = {};
                return foo.bar.a;
            }
        )";
        h::common::write_to_file(module_a_file_path, module_a_code);

        std::filesystem::path const module_b_file_path = root_directory / "B.hltxt";
        std::string_view const module_b_code = R"(    
            module B;

            import C as C;

            export struct Foo
            {
                bar: C.Bar = 0;
            }
        )";
        h::common::write_to_file(module_b_file_path, module_b_code);

        std::filesystem::path const module_c_file_path = root_directory / "C.hltxt";
        std::string_view const module_c_code = R"(    
            module C;

            export struct Bar
            {
                a: Int32 = 0;
            }
        )";
        h::common::write_to_file(module_c_file_path, module_c_code);

        std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path
        {
            std::make_pair("A", module_a_file_path),
            std::make_pair("B", module_b_file_path),
            std::make_pair("C", module_c_file_path),
        };

        std::pmr::unordered_multimap<std::pmr::string, std::pmr::string> const module_name_to_reverse_dependencies
        {
            std::make_pair("B", "A"),
            std::make_pair("C", "B"),
        };

        std::pmr::unordered_map<std::pmr::string, h::compiler::Symbol_name_to_hash> const module_name_to_symbol_hashes
        {
            std::make_pair("B", h::compiler::hash_export_interface(parse_core_module(parser, module_b_file_path, build_directory_path), {})),
            std::make_pair("C", h::compiler::hash_export_interface(parse_core_module(parser, module_c_file_path, build_directory_path), {})),
        };

        std::string_view const new_module_c_code = R"(    
            module C;

            export struct Bar
            {
                a: Int32 = 1;
            }
        )";
        h::common::write_to_file(module_c_file_path, new_module_c_code);

        std::pmr::vector<std::pmr::string> const modules_to_recompile = h::compiler::find_modules_to_recompile(
            parse_core_module(parser, module_c_file_path, build_directory_path),
            module_name_to_file_path,
            module_name_to_reverse_dependencies,
            module_name_to_symbol_hashes,
            parser,
            build_directory_path,
            {},
            {}
        );

        std::pmr::vector<std::pmr::string> const expected_modules_to_recompile
        {
            "B",
            "A",
        };

        CHECK(modules_to_recompile == expected_modules_to_recompile);
    }
}
