#include <cstdio>
#include <nlohmann/json_fwd.hpp>
#include <optional>
#include <string_view>

#include <catch2/catch_all.hpp>

import h.core;
import h.module_examples;
import h.parser.convertor;
import h.parser.parse_tree;
import h.parser.parser;

namespace h::parser
{
    static void test_convertor(
        std::string_view const source,
        h::Module const& expected_module
    )
    {
        Parser parser = create_parser(true);
        Parse_tree tree = parse(parser, nullptr, source);
        Parse_node const root = get_root_node(tree);

        h::Module const actual_module = parse_node_to_module(
            tree,
            root,
            {}
        );

        CHECK(actual_module == expected_module);

        destroy_tree(std::move(tree));
        destroy_parser(std::move(parser));
    }

    TEST_CASE("Converts Hello World")
    {
        std::string_view const source = R"(
module Hello_world;

import C.stdio as stdio;

export function hello() -> ()
{
    stdio.puts("Hello world!");
}
)";

        h::Module const expected_module = h::module_examples::create_hello_world();
        test_convertor(source, expected_module);
    }
}
