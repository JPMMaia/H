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
        this->symbol_to_module_name_map.clear();
        this->jit_data.release();
        this->llvm_data.release();
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
        Module_name_to_file_path& value,
        std::string_view const module_name
    )
    {
        std::shared_lock<std::shared_mutex> lock{ value.mutex };

        auto location = value.map.find(module_name.data());
        if (location != value.map.end())
            return location->second;
        else
            return std::nullopt;
    }

    std::optional<std::filesystem::path> find_module_file_path(
        Module_name_to_file_path& module_name_to_file_path,
        std::string_view const module_name,
        std::pmr::unordered_map<std::filesystem::path, Artifact> const& artifacts
    )
    {
        std::optional<std::filesystem::path> module_file_path = get_module_file_path(module_name_to_file_path, module_name);
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

        for (auto const& pair : artifacts)
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
        Module_name_to_file_path& module_name_to_file_path,
        std::pmr::unordered_map<std::filesystem::path, Artifact> const& artifacts,
        h::parser::Parser& parser,
        std::filesystem::path const& build_directory_path
    )
    {
        std::optional<std::filesystem::path> const module_file_path = find_module_file_path(
            module_name_to_file_path,
            module_name,
            artifacts
        );
        if (!module_file_path)
            return std::nullopt;

        std::filesystem::path const parsed_file_path = build_directory_path / module_file_path->filename().replace_extension("hl");
        h::parser::parse(parser, *module_file_path, parsed_file_path);

        return parsed_file_path;
    }

    std::optional<std::pmr::vector<h::Module>> find_and_parse_core_module_dependencies(
        h::Module const& core_module,
        Module_name_to_file_path& module_name_to_file_path,
        std::pmr::unordered_map<std::filesystem::path, Artifact> const& artifacts,
        h::parser::Parser& parser,
        std::filesystem::path const& build_directory_path
    )
    {
        std::pmr::vector<h::Module> module_dependecies;
        module_dependecies.reserve(core_module.dependencies.alias_imports.size());

        for (Import_module_with_alias const& import_alias : core_module.dependencies.alias_imports)
        {
            std::optional<std::filesystem::path> module_file_path = find_module_and_parse(
                import_alias.module_name,
                module_name_to_file_path,
                artifacts,
                parser,
                build_directory_path
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
        llvm::DenseMap<llvm::orc::SymbolStringPtr, std::pmr::string>& map,
        std::span<h::Module const> const core_modules,
        llvm::orc::MangleAndInterner& mangle
    )
    {
        for (h::Module const& core_module : core_modules)
        {
            for (h::Function_declaration const& declaration : core_module.export_declarations.function_declarations)
            {
                // TODO fix this
                std::string const mangled_name = mangle_name(
                    core_module.name,
                    declaration.name,
                    Mangle_name_strategy::Only_declaration_name
                );

                llvm::orc::SymbolStringPtr const symbol = mangle(mangled_name);

                map.insert(std::make_pair(symbol, core_module.name));
            }
        }
    }

    bool add_module_for_compilation(
        std::filesystem::path const& module_file_path,
        llvm::orc::JITDylib& library,
        LLVM_data& llvm_data,
        JIT_data& jit_data,
        h::parser::Parser& parser,
        Module_name_to_file_path& module_name_to_file_path,
        std::pmr::unordered_map<std::filesystem::path, Artifact> const& artifacts,
        std::filesystem::path const& build_directory_path,
        llvm::DenseMap<llvm::orc::SymbolStringPtr, std::pmr::string>& symbol_to_module_name_map
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
            find_and_parse_core_module_dependencies(*core_module, module_name_to_file_path, artifacts, parser, build_directory_path);
        if (!core_module_dependencies.has_value())
        {
            ::printf("Failed to read module dependencies of module %s", module_file_path.generic_string().c_str());
            return false;
        }

        insert_symbol_to_module_name_entries(symbol_to_module_name_map, *core_module_dependencies, *jit_data.mangle);

        Core_module_compilation_data core_compilation_data
        {
            .llvm_data = llvm_data,
            .core_module = std::move(*core_module),
            .core_module_dependencies = std::move(*core_module_dependencies)
        };
        add_core_module(jit_data, library, std::move(core_compilation_data));

        return true;
    }

    class H_definition_generator : public llvm::orc::DefinitionGenerator
    {
    public:

        H_definition_generator(
            LLVM_data& llvm_data,
            JIT_data& jit_data,
            h::parser::Parser& parser,
            Module_name_to_file_path& module_name_to_file_path,
            std::pmr::unordered_map<std::filesystem::path, Artifact> const& artifacts,
            std::filesystem::path const& build_directory_path,
            llvm::DenseMap<llvm::orc::SymbolStringPtr, std::pmr::string>& symbol_to_module_name_map
        ) :
            m_llvm_data{ llvm_data },
            m_jit_data{ jit_data },
            m_parser{ parser },
            m_module_name_to_file_path{ module_name_to_file_path },
            m_artifacts{ artifacts },
            m_build_directory_path{ build_directory_path },
            m_symbol_to_module_name_map{ symbol_to_module_name_map }
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

                auto const module_name_location = m_symbol_to_module_name_map.find(symbol);
                if (module_name_location == m_symbol_to_module_name_map.end())
                    continue;

                std::string_view const module_name = module_name_location->second;

                std::optional<std::filesystem::path> const module_file_path =
                    find_module_and_parse(module_name, m_module_name_to_file_path, m_artifacts, m_parser, m_build_directory_path);
                if (!module_file_path)
                    continue;

                add_module_for_compilation(
                    *module_file_path,
                    library,
                    m_llvm_data,
                    m_jit_data,
                    m_parser,
                    m_module_name_to_file_path,
                    m_artifacts,
                    m_build_directory_path,
                    m_symbol_to_module_name_map
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
        LLVM_data& m_llvm_data;
        JIT_data& m_jit_data;
        h::parser::Parser& m_parser;
        llvm::DenseMap<llvm::orc::SymbolStringPtr, std::pmr::string>& m_symbol_to_module_name_map;
        Module_name_to_file_path& m_module_name_to_file_path;
        std::pmr::unordered_map<std::filesystem::path, Artifact> const& m_artifacts;
        std::pmr::unordered_map<std::filesystem::path, Repository> m_repositories;
        std::filesystem::path m_build_directory_path;
    };

    static void handle_file_change(
        JIT_runner& jit_runner,
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
                std::filesystem::path const parsed_file_path = jit_runner.build_directory_path / source_file_path.filename().replace_extension("hl");
                h::parser::parse(jit_runner.parser, source_file_path, parsed_file_path);

                add_module_for_compilation(
                    parsed_file_path,
                    get_main_library(*jit_runner.jit_data),
                    *jit_runner.llvm_data,
                    *jit_runner.jit_data,
                    jit_runner.parser,
                    jit_runner.module_name_to_file_path,
                    jit_runner.artifacts,
                    jit_runner.build_directory_path,
                    jit_runner.symbol_to_module_name_map
                );
            }
        }

        // TODO when a file is created, check if it matches the includes and then (optional) add to the watch list and to the recompile module layer
        // TODO when a file is removed, maybe remove the definitions?
    }

    void parse_entry_point_module_and_add_for_compilation(
        JIT_runner& jit_runner,
        Artifact const& artifact
    )
    {
        if (artifact.info.has_value())
        {
            if (std::holds_alternative<Executable_info>(*artifact.info))
            {
                Executable_info const& executable_info = std::get<Executable_info>(*artifact.info);

                std::filesystem::path const source_file_path = artifact.file_path.parent_path() / executable_info.source;

                std::filesystem::path const parsed_file_path = jit_runner.build_directory_path / source_file_path.filename().replace_extension("hl");
                h::parser::parse(jit_runner.parser, source_file_path, parsed_file_path);

                add_module_for_compilation(
                    parsed_file_path,
                    get_main_library(*jit_runner.jit_data),
                    *jit_runner.llvm_data,
                    *jit_runner.jit_data,
                    jit_runner.parser,
                    jit_runner.module_name_to_file_path,
                    jit_runner.artifacts,
                    jit_runner.build_directory_path,
                    jit_runner.symbol_to_module_name_map
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

        std::unique_ptr<JIT_runner> jit_runner = std::make_unique<JIT_runner>();
        JIT_runner& jit_runner_reference = *jit_runner;

        jit_runner_reference.parser = h::parser::create_parser();
        jit_runner_reference.build_directory_path = build_directory_path;

        Module_name_to_file_path& module_name_to_file_path = jit_runner_reference.module_name_to_file_path;

        Artifact artifact = get_artifact(artifact_configuration_file_path);

        std::function<void(wtr::watcher::event const&)> callback = [&jit_runner_reference](wtr::event const event) -> void
        {
            handle_file_change(jit_runner_reference, event);
        };

        std::unique_ptr<File_watcher> file_watcher = watch(artifact, repositories_file_paths, std::move(callback));
        jit_runner->file_watcher = std::move(file_watcher);

        std::unique_ptr<h::compiler::LLVM_data> llvm_data = std::make_unique<h::compiler::LLVM_data>(h::compiler::initialize_llvm());

        std::unique_ptr<JIT_data> jit_data = create_jit_data(
            llvm_data->data_layout
        );

        std::pmr::unordered_map<std::filesystem::path, Artifact> artifacts =
        {
            {artifact_configuration_file_path, artifact}
        };
        jit_runner->artifacts = std::move(artifacts);

        add_generator(*jit_data, std::make_unique<H_definition_generator>(*llvm_data, *jit_data, jit_runner_reference.parser, module_name_to_file_path, jit_runner->artifacts, build_directory_path, jit_runner->symbol_to_module_name_map));

        jit_runner->jit_data = std::move(jit_data);
        jit_runner->llvm_data = std::move(llvm_data);

        parse_entry_point_module_and_add_for_compilation(*jit_runner, artifact);

        return jit_runner;
    }
}
