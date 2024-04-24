#include <docopt.h>

#include <filesystem>
#include <map>
#include <string>

import h.parser;

static constexpr char g_usage[] =
R"(H parser

    Usage:
      h_parser <source_file> <output_file>
      h_parser (-h | --help)
      h_parser --version

    Options:
      -h --help                                   Show this screen.
      --version                                   Show version.
)";

int main(int const argc, char const* const* argv)
{
  std::map<std::string, docopt::value> const arguments = docopt::docopt(g_usage, { argv + 1, argv + argc }, true, "H Parser 0.1.0");

  std::filesystem::path const source_file_path = arguments.at("<source_file>").asString();
  std::filesystem::path const output_file_path = arguments.at("<output_file>").asString();

  h::parser::Parser const parser = h::parser::create_parser();
  h::parser::parse(parser, source_file_path, output_file_path);

  return 0;
}