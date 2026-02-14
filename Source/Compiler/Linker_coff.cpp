module;

#include <lld/Common/Driver.h>

#include <llvm/Object/ArchiveWriter.h>
#include <llvm/Support/MemoryBuffer.h>
#include <llvm/Support/raw_ostream.h>

#include <filesystem>
#include <format>
#include <span>
#include <string>
#include <string_view>
#include <vector>

module h.compiler.linker;

import h.common;

LLD_HAS_DRIVER(coff);

namespace h::compiler
{
    static void add_alternate_names(
        std::pmr::vector<std::string>& arguments_storage,
        std::span<std::pmr::string const> const libraries
    )
    {
        auto const is_msvcrt = [](std::pmr::string const& library) -> bool
        {
            return library.starts_with("libcmt")
            || library.starts_with("msvcrt")
            || library.starts_with("msvcmrt")
            || library.starts_with("msvcurt");
        };
        
        auto const location = std::find_if(libraries.begin(), libraries.end(), is_msvcrt);
        if (location == libraries.end())
            return;
    
        // Found by running `dumpbin /directives msvcrt.lib`
        arguments_storage.push_back("/alternatename:__acrt_initialize=__scrt_stub_for_acrt_initialize");
        arguments_storage.push_back("/alternatename:__acrt_uninitialize=__scrt_stub_for_acrt_uninitialize");
        arguments_storage.push_back("/alternatename:__acrt_uninitialize_critical=__scrt_stub_for_acrt_uninitialize_critical");
        arguments_storage.push_back("/alternatename:__acrt_thread_attach=__scrt_stub_for_acrt_thread_attach");
        arguments_storage.push_back("/alternatename:__acrt_thread_detach=__scrt_stub_for_acrt_thread_detach");
        arguments_storage.push_back("/alternatename:_is_c_termination_complete=__scrt_stub_for_is_c_termination_complete");
        arguments_storage.push_back("/alternatename:__vcrt_initialize=__scrt_stub_for_acrt_initialize");
        arguments_storage.push_back("/alternatename:__vcrt_uninitialize=__scrt_stub_for_acrt_uninitialize");
        arguments_storage.push_back("/alternatename:__vcrt_uninitialize_critical=__scrt_stub_for_acrt_uninitialize_critical");
        arguments_storage.push_back("/alternatename:__vcrt_thread_attach=__scrt_stub_for_acrt_thread_attach");
        arguments_storage.push_back("/alternatename:__vcrt_thread_detach=__scrt_stub_for_acrt_thread_detach");
    }

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

        if (options.link_type == Link_type::Executable)
        {
            arguments_storage.push_back(std::format("/entry:{}", options.entry_point.value_or(std::string_view{"main"})));
            arguments_storage.push_back(std::format("/out:{}.exe", output.generic_string()));
            arguments_storage.push_back("/subsystem:console");
        }

        if (options.debug)
            arguments_storage.push_back("/debug:full");

        for (std::string_view const library : libraries)
        {
            std::filesystem::path library_path = library;
            if (!library.ends_with(".lib"))
                library_path += ".lib";

            if (library_path.is_absolute())
            {
                arguments_storage.push_back(library_path.generic_string());
            }
            else
            {
                arguments_storage.push_back(std::format("/defaultlib:{}", library_path.generic_string()));
            }
        }

        add_alternate_names(arguments_storage, libraries);

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

        std::fprintf(stdout, "Linking '%s' with arguments: ", output.generic_string().c_str());
        for (char const* const argument : arguments)
        {
            std::fprintf(stdout, "%s ", argument);
        }
        std::fprintf(stdout, "\n");
        std::fflush(stdout);

        lld::Result const result = lld::lldMain(arguments, llvm::outs(), llvm::errs(), { {lld::WinLink, &lld::coff::link} });

        return result.retCode == 0;
    }

    bool create_static_library(
        std::span<std::filesystem::path const> const object_file_paths,
        std::span<std::pmr::string const> const libraries,
        std::filesystem::path const& output,
        Linker_options const& options
    )
    {
        std::pmr::vector<llvm::NewArchiveMember> members;
        members.resize(object_file_paths.size());

        for (std::size_t index = 0; index < object_file_paths.size(); ++index)
        {
            llvm::Expected<llvm::NewArchiveMember> member = llvm::NewArchiveMember::getFile(object_file_paths[index].generic_string(), true);
            if (llvm::Error error = member.takeError())
                h::common::print_message_and_exit(std::format("Error while creating creating member for static library: {}", llvm::toString(std::move(error))));

            members[index] = std::move(member.get());
        }

        llvm::Error error = llvm::writeArchive(
            std::format("{}.lib", output.generic_string()),
            members,
            llvm::SymtabWritingMode::NormalSymtab,
            llvm::object::Archive::K_COFF,
            true,
            false
        );

        if (llvm::Error error = std::move(error))
            return false;

        return true;
    }
}
