module;

#include <llvm/Analysis/CGSCCPassManager.h>
#include <llvm/Analysis/LoopAnalysisManager.h>
#include <llvm/IR/LLVMContext.h>
#include <llvm/IR/Module.h>
#include <llvm/IR/PassInstrumentation.h>
#include <llvm/IR/PassManager.h>
#include <llvm/Passes/StandardInstrumentations.h>
#include <llvm/Target/TargetMachine.h>

#include <llvm/ADT/DenseMap.h>
#include <llvm/ExecutionEngine/Orc/Core.h>
#include <llvm/ExecutionEngine/Orc/Mangling.h>
#include <llvm/ExecutionEngine/Orc/Shared/ExecutorSymbolDef.h>
#include <llvm/Support/Error.h>

#include <wtr/watcher.hpp>

#include <cstdio>
#include <filesystem>
#include <format>
#include <functional>
#include <memory>
#include <memory_resource>
#include <mutex>
#include <optional>
#include <shared_mutex>
#include <string>
#include <span>
#include <variant>

module h.compiler.jit_runner;

import h.common;
import h.compiler;
import h.compiler.artifact;
import h.compiler.common;
import h.compiler.core_module_layer;
import h.compiler.file_watcher;
import h.compiler.jit_compiler;
import h.compiler.repository;
import h.core;
import h.json_serializer;
import h.parser;

namespace h::compiler
{
    JIT_runner::~JIT_runner()
    {
        this->file_watcher.release();
        this->protected_data.symbol_to_module_name_map.clear();
        this->unprotected_data.jit_data.release();
        this->unprotected_data.llvm_data.release();
    }

    static std::optional<std::pmr::string> read_module_name(std::filesystem::path const& unparsed_file_path)
    {
        std::string const path_string = unparsed_file_path.generic_string();
        std::FILE* file_stream = std::fopen(path_string.c_str(), "r");
        if (file_stream == nullptr)
            return std::nullopt;

        std::optional<std::pmr::string> module_name = std::nullopt;

        constexpr int line_size = 1000;
        char line[line_size];
        while (true)
        {
            if (std::fgets(line, line_size, file_stream) == nullptr)
                break;

            char const* const end = std::find(line, line + line_size, '\0');

            std::string_view const line_view{ line, end };

            std::string_view::size_type const line_without_spaces_begin = line_view.find_first_not_of(' ');
            if (line_without_spaces_begin == std::string_view::npos)
                continue;

            std::string_view const line_without_spaces{ line + line_without_spaces_begin, end - 1 };

            if (line_without_spaces.starts_with("module ") && line_without_spaces.ends_with(';'))
            {
                module_name = line_without_spaces.substr(7, line_without_spaces.size() - 8);
                break;
            }
        }

        std::fclose(file_stream);

        return module_name;
    }

    std::optional<std::filesystem::path> get_module_file_path(
        std::string_view const module_name,
        std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const& module_name_to_file_path
    )
    {
        auto location = module_name_to_file_path.find(module_name.data());
        if (location != module_name_to_file_path.end())
            return location->second;
        else
            return std::nullopt;
    }

    std::optional<std::filesystem::path> find_module_file_path(
        std::string_view const module_name,
        JIT_runner_protected_data& protected_data
    )
    {
        std::shared_lock<std::shared_mutex> lock{ protected_data.mutex };

        std::optional<std::filesystem::path> module_file_path = get_module_file_path(module_name, protected_data.module_name_to_file_path);
        if (module_file_path)
            return module_file_path;

        auto const predicate = [module_name, &module_file_path](std::filesystem::path const& file_path) -> bool
        {
            std::optional<std::pmr::string> const current_module_name = read_module_name(file_path);
            if (!current_module_name)
                return false;

            if (*current_module_name == module_name)
            {
                module_file_path = file_path;
                return true;
            }

            return false;
        };

        for (auto const& pair : protected_data.artifacts)
        {
            bool const found = visit_included_files(pair.second, predicate);
            if (found)
                break;
        }

        // TODO add entry to module_name_to_file_path 

        return module_file_path;
    }

    std::optional<std::filesystem::path> find_module_and_parse(
        std::string_view const module_name,
        JIT_runner_unprotected_data const& unprotected_data,
        JIT_runner_protected_data& protected_data
    )
    {
        std::optional<std::filesystem::path> const module_file_path = find_module_file_path(
            module_name,
            protected_data
        );
        if (!module_file_path)
            return std::nullopt;

        std::filesystem::path const parsed_file_path = unprotected_data.build_directory_path / module_file_path->filename().replace_extension("hl");
        h::parser::parse(unprotected_data.parser, *module_file_path, parsed_file_path);

        return parsed_file_path;
    }

    std::optional<std::pmr::vector<h::Module>> find_and_parse_core_module_dependencies(
        h::Module const& core_module,
        JIT_runner_unprotected_data const& unprotected_data,
        JIT_runner_protected_data& protected_data
    )
    {
        std::pmr::vector<h::Module> module_dependecies;
        module_dependecies.reserve(core_module.dependencies.alias_imports.size());

        for (Import_module_with_alias const& import_alias : core_module.dependencies.alias_imports)
        {
            std::optional<std::filesystem::path> module_file_path = find_module_and_parse(
                import_alias.module_name,
                unprotected_data,
                protected_data
            );

            if (!module_file_path)
                return std::nullopt;

            std::optional<h::Module> import_core_module = h::json::read_module_export_declarations(*module_file_path);
            if (!import_core_module.has_value())
            {
                ::printf("Failed to read contents of %s (invalid module)", module_file_path->generic_string().c_str());
                return std::nullopt;
            }
        }

        remove_unused_declarations(core_module, module_dependecies);

        return module_dependecies;
    }

    void insert_symbol_to_module_name_entries(
        std::span<h::Module const> const core_modules,
        llvm::orc::MangleAndInterner& mangle,
        JIT_runner_protected_data& protected_data
    )
    {
        std::unique_lock<std::shared_mutex> lock{ protected_data.mutex };

        for (h::Module const& core_module : core_modules)
        {
            for (h::Function_declaration const& declaration : core_module.export_declarations.function_declarations)
            {
                std::string const mangled_name = mangle_function_name(core_module, declaration.name);
                llvm::orc::SymbolStringPtr const symbol = mangle(mangled_name);

                protected_data.symbol_to_module_name_map.insert(std::make_pair(symbol, core_module.name));
            }
        }
    }

    bool add_module_for_compilation(
        std::filesystem::path const& module_file_path,
        llvm::orc::JITDylib& library,
        JIT_runner_unprotected_data const& unprotected_data,
        JIT_runner_protected_data& protected_data
    )
    {
        std::optional<std::pmr::string> const json_data = h::common::get_file_contents(module_file_path);
        if (!json_data.has_value())
        {
            ::printf("Failed to read contents of %s", module_file_path.generic_string().c_str());
            return false;
        }

        std::optional<h::Module> const core_module = h::json::read<h::Module>(json_data.value().c_str());
        if (!core_module.has_value())
        {
            ::printf("Failed to read contents of module %s", module_file_path.generic_string().c_str());
            return false;
        }

        std::optional<std::pmr::vector<h::Module>> core_module_dependencies =
            find_and_parse_core_module_dependencies(*core_module, unprotected_data, protected_data);
        if (!core_module_dependencies.has_value())
        {
            ::printf("Failed to read module dependencies of module %s", module_file_path.generic_string().c_str());
            return false;
        }

        insert_symbol_to_module_name_entries(*core_module_dependencies, *unprotected_data.jit_data->mangle, protected_data);

        Core_module_compilation_data core_compilation_data
        {
            .llvm_data = *unprotected_data.llvm_data,
            .core_module = std::move(*core_module),
            .core_module_dependencies = std::move(*core_module_dependencies)
        };
        add_core_module(*unprotected_data.jit_data, library, std::move(core_compilation_data));

        return true;
    }

    std::optional<std::string_view> get_module_name(
        llvm::orc::SymbolStringPtr const symbol,
        JIT_runner_protected_data& protected_data
    )
    {
        std::shared_lock<std::shared_mutex> lock{ protected_data.mutex };

        auto const module_name_location = protected_data.symbol_to_module_name_map.find(symbol);
        if (module_name_location == protected_data.symbol_to_module_name_map.end())
            return std::nullopt;

        std::string_view const module_name = module_name_location->second;
        return module_name;
    }

    class H_definition_generator : public llvm::orc::DefinitionGenerator
    {
    public:

        H_definition_generator(
            JIT_runner_unprotected_data const& unprotected_data,
            JIT_runner_protected_data& protected_data
        ) :
            m_unprotected_data{ unprotected_data },
            m_protected_data{ protected_data }
        {
        }

        virtual ~H_definition_generator()
        {
        }

        /// DefinitionGenerators should override this method to insert new
        /// definitions into the parent JITDylib. K specifies the kind of this
        /// lookup. JD specifies the target JITDylib being searched, and
        /// JDLookupFlags specifies whether the search should match against
        /// hidden symbols. Finally, Symbols describes the set of unresolved
        /// symbols and their associated lookup flags.
        virtual llvm::Error tryToGenerate(
            llvm::orc::LookupState& lookup_state,
            llvm::orc::LookupKind lookup_kind,
            llvm::orc::JITDylib& library,
            llvm::orc::JITDylibLookupFlags lookup_flags,
            llvm::orc::SymbolLookupSet const& symbol_lookup_set
        ) final
        {
            for (std::pair<llvm::orc::SymbolStringPtr, llvm::orc::SymbolLookupFlags> const& symbol_lookup : symbol_lookup_set)
            {
                llvm::orc::SymbolStringPtr const symbol = symbol_lookup.first;

                std::optional<std::string_view> const module_name = get_module_name(symbol, m_protected_data);
                if (!module_name)
                    continue;

                std::optional<std::filesystem::path> const module_file_path = find_module_and_parse(*module_name, m_unprotected_data, m_protected_data);
                if (!module_file_path)
                    continue;

                add_module_for_compilation(
                    *module_file_path,
                    library,
                    m_unprotected_data,
                    m_protected_data
                );

                // TODO
                // Cache module paths:
                /*{
                    std::unique_lock<std::shared_mutex> lock{ m_module_name_to_file_path.mutex };

                    m_module_name_to_file_path.map.emplace(std::pmr::string{ module_name }, *module_file_path);

                    for (std::size_t index = 0; index < module_dependecies_names.size(); ++index)
                    {
                        std::string_view const dependency_module_name = module_dependecies_names[index];
                        std::filesystem::path const& dependency_file_path = module_dependencies_file_paths.value()[index];

                        m_module_name_to_file_path.map.insert(std::make_pair(std::pmr::string{ module_name }, dependency_file_path));
                    }
                }*/
            }

            return llvm::Error::success();
        }

    private:
        JIT_runner_unprotected_data const& m_unprotected_data;
        JIT_runner_protected_data& m_protected_data;
    };

    static void handle_file_change(
        JIT_runner_unprotected_data const& unprotected_data,
        JIT_runner_protected_data& protected_data,
        wtr::event const event
    )
    {
        constexpr bool print_events = true;
        if (print_events)
        {
            /*std::pmr::string const effect_type = wtr::to<std::pmr::string>(event.effect_type);
            std::pmr::string const path_type = wtr::to<std::pmr::string>(event.path_type);
            std::pmr::string const path_name = wtr::to<std::pmr::string>(event.path_name);
            std::pmr::string const associated = (event.associated ? " -> " + wtr::to<std::pmr::string>(event.associated->path_name) : "");

            std::string const output_string = std::format("{} {} {} {}\n", effect_type, path_type, path_name, associated);
            std::puts(output_string.c_str());*/
        }

        // TODO thread safety

        // TODO update module_name_to_file_path map

        // Any time there is a watched file is modified, add to the recompile module layer:
        if (event.effect_type == wtr::event::effect_type::modify)
        {
            std::filesystem::path const& source_file_path = event.path_name;
            if (source_file_path.extension() == ".hltxt")
            {
                std::filesystem::path const parsed_file_path = unprotected_data.build_directory_path / source_file_path.filename().replace_extension("hl");
                h::parser::parse(unprotected_data.parser, source_file_path, parsed_file_path);

                add_module_for_compilation(
                    parsed_file_path,
                    get_main_library(*unprotected_data.jit_data),
                    unprotected_data,
                    protected_data
                );
            }
        }

        // TODO when a file is created, check if it matches the includes and then (optional) add to the watch list and to the recompile module layer
        // TODO when a file is removed, maybe remove the definitions?
    }

    void parse_entry_point_module_and_add_for_compilation(
        JIT_runner_unprotected_data const& unprotected_data,
        JIT_runner_protected_data& protected_data,
        Artifact const& artifact
    )
    {
        if (artifact.info.has_value())
        {
            if (std::holds_alternative<Executable_info>(*artifact.info))
            {
                Executable_info const& executable_info = std::get<Executable_info>(*artifact.info);

                std::filesystem::path const source_file_path = artifact.file_path.parent_path() / executable_info.source;

                std::filesystem::path const parsed_file_path = unprotected_data.build_directory_path / source_file_path.filename().replace_extension("hl");
                h::parser::parse(unprotected_data.parser, source_file_path, parsed_file_path);

                add_module_for_compilation(
                    parsed_file_path,
                    get_main_library(*unprotected_data.jit_data),
                    unprotected_data,
                    protected_data
                );
            }
        }
    }

    std::unique_ptr<JIT_runner> setup_jit_and_watch(
        std::filesystem::path const& artifact_configuration_file_path,
        std::span<std::filesystem::path const> const repositories_file_paths,
        std::filesystem::path const& build_directory_path
    )
    {
        // Print internal LLVM messages:
        //llvm::DebugFlag = true;

        Artifact artifact = get_artifact(artifact_configuration_file_path);

        std::unique_ptr<JIT_runner> jit_runner = std::make_unique<JIT_runner>();

        // Create readonly and protected data:
        {
            std::unique_ptr<h::compiler::LLVM_data> llvm_data = std::make_unique<h::compiler::LLVM_data>(h::compiler::initialize_llvm());
            std::unique_ptr<JIT_data> jit_data = create_jit_data(llvm_data->data_layout);

            jit_runner->unprotected_data =
            {
                .build_directory_path = build_directory_path,
                .parser = h::parser::create_parser(),
                .llvm_data = std::move(llvm_data),
                .jit_data = std::move(jit_data),
            };

            jit_runner->protected_data.artifacts =
            {
                {artifact_configuration_file_path, artifact}
            };
        }

        // Create file watcher:
        {
            JIT_runner_unprotected_data const& unprotected_data = jit_runner->unprotected_data;
            JIT_runner_protected_data& protected_data = jit_runner->protected_data;

            std::function<void(wtr::watcher::event const&)> callback = [&](wtr::event const event) -> void
            {
                handle_file_change(unprotected_data, protected_data, event);
            };

            std::unique_ptr<File_watcher> file_watcher = watch(artifact, repositories_file_paths, std::move(callback));
            jit_runner->file_watcher = std::move(file_watcher);
        }

        // Add generator:
        {
            JIT_runner_unprotected_data const& unprotected_data = jit_runner->unprotected_data;
            JIT_runner_protected_data& protected_data = jit_runner->protected_data;

            add_generator(*jit_runner->unprotected_data.jit_data, std::make_unique<H_definition_generator>(unprotected_data, protected_data));
        }

        parse_entry_point_module_and_add_for_compilation(jit_runner->unprotected_data, jit_runner->protected_data, artifact);

        return jit_runner;
    }
}
