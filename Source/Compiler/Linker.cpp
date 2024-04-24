module;

#include <lld/Common/Driver.h>

#include <filesystem>
#include <format>
#include <span>
#include <string>
#include <string_view>
#include <vector>

module h.compiler.linker;

LLD_HAS_DRIVER(coff);

namespace h::compiler
{
    bool link(
        std::span<std::filesystem::path const> const object_file_paths,
        std::span<std::pmr::string const> const libraries,
        std::filesystem::path const& output,
        Linker_options const& options
    )
    {
        std::pmr::vector<std::string> arguments_storage;
        arguments_storage.reserve(2 + object_file_paths.size());

        arguments_storage.push_back("");
        arguments_storage.push_back("-flavor");
        arguments_storage.push_back("link");
        arguments_storage.push_back(std::format("/entry:{}", options.entry_point));
        arguments_storage.push_back(std::format("/out:{}", output.generic_string()));

        for (std::string_view const library : libraries)
        {
            arguments_storage.push_back(std::format("/defaultlib:{}", library));
        }

        for (std::filesystem::path const& object_file_path : object_file_paths)
        {
            arguments_storage.push_back(object_file_path.generic_string());
        }


        std::pmr::vector<char const*> arguments;
        arguments.reserve(arguments_storage.size());

        for (std::string const& argument : arguments_storage)
        {
            arguments.push_back(argument.c_str());
        }

        lld::Result const result = lld::lldMain(arguments, llvm::outs(), llvm::errs(), { {lld::WinLink, &lld::coff::link} });

        return result.retCode == 0;
    }
}
