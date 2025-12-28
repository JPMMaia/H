module;

#include <format>
#include <filesystem>
#include <memory_resource>
#include <span>
#include <string>
#include <unordered_map>
#include <variant>
#include <vector>

#include <llvm/IR/Module.h>

module h.compiler.builder;

import h.binary_serializer;
import h.core;
import h.core.struct_layout;
import h.common;
import h.compiler;
import h.compiler.artifact;
import h.compiler.clang_code_generation;
import h.compiler.clang_compiler;
import h.compiler.compile_commands_generator;
import h.compiler.linker;
import h.compiler.profiler;
import h.compiler.repository;
import h.compiler.target;
import h.c_header_converter;
import h.json_serializer;
import h.parser.convertor;
import h.parser.parse_tree;
import h.parser.parser;

namespace h::compiler
{
    static std::filesystem::path get_hl_build_directory(
        std::filesystem::path const& build_directory_path
    )
    {
        return build_directory_path / "artifacts";
    }

    static std::filesystem::path get_bitcode_build_directory(
        std::filesystem::path const& build_directory_path
    )
    {
        return build_directory_path / "artifacts";
    }

    static void create_directory_if_it_does_not_exist(std::filesystem::path const& path)
    {
        if (!std::filesystem::exists(path))
        {
            std::filesystem::create_directories(path);
        }
    }

    Profiler* get_profiler(Builder& builder)
    {
        return builder.use_profiler ? &builder.profiler : nullptr;
    }

    Builder create_builder(
        h::compiler::Target const& target,
        std::filesystem::path const& build_directory_path,
        std::span<std::filesystem::path const> header_search_paths,
        std::span<std::filesystem::path const> repository_paths,
        h::compiler::Compilation_options const& compilation_options,
        Builder_options const& builder_options,
        std::pmr::polymorphic_allocator<> output_allocator
    )
    {
        return
        {
            .target = target,
            .build_directory_path = build_directory_path,
            .header_search_paths = std::pmr::vector<std::filesystem::path>{header_search_paths.begin(), header_search_paths.end(), output_allocator},
            .repositories = get_repositories(repository_paths),
            .compilation_options = compilation_options,
            .profiler = {},
            .use_profiler = true,
            .output_module_json = false,
            .output_llvm_ir = builder_options.output_llvm_ir,
        };
    }

    void build_artifact(
        Builder& builder,
        std::filesystem::path const& artifact_file_path
    )
    {
        start_timer(get_profiler(builder), "build_artifact");

        std::pmr::polymorphic_allocator<> output_allocator;
        std::pmr::polymorphic_allocator<> temporaries_allocator;

        std::filesystem::path const hl_build_directory = get_hl_build_directory(
            builder.build_directory_path
        );
        create_directory_if_it_does_not_exist(hl_build_directory);

        std::pmr::vector<Artifact> const artifacts = get_sorted_artifacts(
            { &artifact_file_path, 1 },
            builder.repositories,
            output_allocator,
            temporaries_allocator
        );

        std::pmr::vector<h::Module> header_modules = parse_c_headers_and_cache(
            builder,
            artifacts,
            output_allocator,
            temporaries_allocator
        );
        add_builtin_module(header_modules, output_allocator, temporaries_allocator);

        std::pmr::vector<std::filesystem::path> const source_file_paths = get_artifacts_source_files(
            artifacts,
            output_allocator,
            temporaries_allocator
        );

        std::pmr::vector<h::Module> core_modules = parse_source_files_and_cache(
            builder,
            source_file_paths,
            output_allocator,
            temporaries_allocator
        );

        /*core_modules.insert(
            core_modules.begin(),
            std::make_move_iterator(header_modules.begin()),
            std::make_move_iterator(header_modules.end())
        );*/

        Compilation_options const& compilation_options = builder.compilation_options;

        LLVM_data llvm_data = initialize_llvm(
            compilation_options
        );

        if (!compile_cpp_and_write_to_bitcode_files(builder, artifacts, llvm_data, compilation_options, temporaries_allocator))
            h::common::print_message_and_exit(std::format("Failed to compile c++."));

        start_timer(get_profiler(builder), "process_modules_and_create_compilation_database");

        // TODO make const
        Compilation_database compilation_database = process_modules_and_create_compilation_database(
            llvm_data,
            header_modules,
            core_modules,
            output_allocator,
            temporaries_allocator
        );

        end_timer(get_profiler(builder), "process_modules_and_create_compilation_database");

        std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const module_name_to_file_path_map = create_module_name_to_file_path_map(
            builder,
            header_modules,
            core_modules,
            output_allocator,
            temporaries_allocator
        );

        compile_and_write_to_bitcode_files(
            builder,
            core_modules,
            module_name_to_file_path_map,
            llvm_data,
            compilation_database,
            compilation_options
        );

        link_artifacts(
            builder,
            artifacts,
            compilation_options,
            temporaries_allocator
        );

        if (builder.target.operating_system == "windows")
        {
            copy_dlls(
                builder,
                artifacts,
                temporaries_allocator
            );
        }

        end_timer(get_profiler(builder), "build_artifact");

        print_profiler_timings(get_profiler(builder));
    }

    void add_artifact_dependencies(
        std::pmr::vector<Artifact>& dependencies,
        Artifact const& artifact,
        std::span<Repository const> repositories,
        std::pmr::polymorphic_allocator<> const& output_allocator,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        for (h::compiler::Dependency const& dependency : artifact.dependencies)
        {
            auto const location = std::find_if(
                dependencies.begin(),
                dependencies.end(),
                [&](Artifact const& artifact) -> bool { return artifact.name == dependency.artifact_name; }
            );
            if (location != dependencies.end())
                continue;

            std::optional<std::filesystem::path> const dependency_location = h::compiler::get_artifact_location(repositories, dependency.artifact_name);
            if (!dependency_location.has_value())
                h::common::print_message_and_exit(std::format("Could not find dependency {}.", dependency.artifact_name));

            std::filesystem::path const dependency_configuration_file_path = dependency_location.value();

            Artifact dependency_artifact = h::compiler::get_artifact(dependency_configuration_file_path);
            
            add_artifact_dependencies(
                dependencies,
                dependency_artifact,
                repositories,
                output_allocator,
                temporaries_allocator
            );

            dependencies.push_back(std::move(dependency_artifact));
        }
    }

    std::pmr::vector<Artifact> get_sorted_artifacts(
        std::span<std::filesystem::path const> const artifact_file_paths,
        std::span<Repository const> repositories,
        std::pmr::polymorphic_allocator<> const& output_allocator,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        std::pmr::vector<Artifact> artifacts{temporaries_allocator};

        for (std::filesystem::path const& artifact_file_path : artifact_file_paths)
        {
            Artifact const artifact = get_artifact(artifact_file_path);

            add_artifact_dependencies(
                artifacts,
                artifact,
                repositories,
                output_allocator,
                temporaries_allocator
            );
            
            artifacts.push_back(artifact);
        }

        return std::pmr::vector<Artifact>{std::move(artifacts), output_allocator};
    }


    std::pmr::vector<std::filesystem::path> get_artifacts_source_files(
        std::span<Artifact const> const artifacts,
        std::pmr::polymorphic_allocator<> const& output_allocator,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        std::pmr::vector<std::filesystem::path> source_files{temporaries_allocator};

        for (Artifact const& artifact : artifacts)
        {
            std::pmr::vector<std::filesystem::path> artifact_source_files = get_artifact_hlang_source_files(
                artifact,
                temporaries_allocator,
                temporaries_allocator
            );

            source_files.insert(source_files.end(), artifact_source_files.begin(), artifact_source_files.end());
        }

        return std::pmr::vector<std::filesystem::path>{std::move(source_files), output_allocator};
    }

    static std::pmr::vector<std::filesystem::path> create_c_header_search_paths(
        std::optional<std::filesystem::path> const& artifact_parent_path,
        std::span<std::filesystem::path const> const builder_header_search_paths,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        std::pmr::vector<std::filesystem::path> header_search_paths{temporaries_allocator};
        header_search_paths.reserve(builder_header_search_paths.size() + 1);
        
        if (artifact_parent_path.has_value())
            header_search_paths.push_back(artifact_parent_path.value());
        
        header_search_paths.insert(header_search_paths.end(), builder_header_search_paths.begin(), builder_header_search_paths.end());

        return header_search_paths;
    }

    std::pmr::vector<h::Module> parse_c_headers_and_cache(
        Builder& builder,
        std::span<Artifact const> const artifacts,
        std::pmr::polymorphic_allocator<> const& output_allocator,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        start_timer(get_profiler(builder), "parse_c_headers_and_cache");

        std::pmr::vector<h::Module> header_modules{output_allocator};

        std::filesystem::path const build_directory_path = get_hl_build_directory(builder.build_directory_path);
        create_directory_if_it_does_not_exist(build_directory_path);

        for (Artifact const& artifact : artifacts)
        {
            std::filesystem::path const artifact_parent_path = artifact.file_path.parent_path();

            std::pmr::vector<Source_group const*> const c_header_source_groups = get_c_header_source_groups(
                artifact,
                temporaries_allocator
            );

            for (Source_group const* source_group : c_header_source_groups)
            {
                C_header_source_group const& c_header_source_group = std::get<C_header_source_group>(*source_group->data);
                std::span<C_header const> const c_headers = c_header_source_group.c_headers;

                for (std::size_t header_index = 0; header_index < c_headers.size(); ++header_index)
                {
                    C_header const& c_header = c_headers[header_index];

                    std::string_view const header_module_name = c_header.module_name;
                    std::string_view const header_filename = c_header.header;

                    std::pmr::vector<std::filesystem::path> const header_search_paths = create_c_header_search_paths(
                        artifact_parent_path,
                        builder.header_search_paths,
                        temporaries_allocator
                    );

                    std::optional<std::filesystem::path> const header_path = h::compiler::find_c_header_path(header_filename, header_search_paths);
                    if (!header_path.has_value())
                        h::common::print_message_and_exit(std::format("Could not find header {}. Please provide its location using --header-search-path.", header_filename));

                    std::filesystem::path const header_module_filename = std::format("{}.hlb", header_module_name);
                    std::filesystem::path const output_header_module_path = build_directory_path / header_module_filename;

                    if (std::filesystem::exists(output_header_module_path))
                    {
                        if (is_file_newer_than(output_header_module_path, header_path.value()))
                        {
                            std::optional<Module> header_module = h::binary_serializer::read_module_from_file(output_header_module_path);

                            if (!header_module.has_value())
                                h::common::print_message_and_exit(std::format("Failed to read cached module {}.", output_header_module_path.generic_string()));

                            header_modules.push_back(std::move(header_module.value()));

                            continue;
                        }
                    }

                    h::c::Options const options
                    {
                        .target_triple = std::nullopt,
                        .include_directories = c_header_source_group.search_paths,
                        .public_prefixes = c_header_source_group.public_prefixes,
                        .remove_prefixes = c_header_source_group.remove_prefixes,
                    };

                    std::optional<h::Module> header_module = h::c::import_header_and_write_to_file(header_module_name, header_path.value(), output_header_module_path, options);
                    if (!header_module.has_value())
                        continue;

                    if (builder.output_module_json)
                    {
                        std::filesystem::path const output_module_json_filename = std::format("{}.hlb.json", header_module_name);
                        std::filesystem::path const output_module_json_path = get_hl_build_directory(builder.build_directory_path) / output_module_json_filename;
                        h::json::write<h::Module>(output_module_json_path, *header_module);
                    }

                    header_modules.push_back(std::move(*header_module));
                }
            }
        }

        end_timer(get_profiler(builder), "parse_c_headers_and_cache");

        return header_modules;
    }

    static bool is_compiled_cpp_up_to_date(std::filesystem::path const& output_dependency_file)
    {
        if (!std::filesystem::exists(output_dependency_file))
            return false;

        std::optional<std::pmr::string> const file_contents = h::common::get_file_contents(output_dependency_file);
        if (!file_contents.has_value())
            return false;

        std::size_t start_index = 0;
        std::size_t current_index = 0;

        std::pmr::vector<std::string_view> files;

        std::pmr::string const& input = file_contents.value();
        while (current_index < input.size())
        {
            char const current_character = input[current_index];
            if (current_character == '\n')
            {
                std::string_view const view{ &input[start_index], current_index - start_index };
                
                std::size_t end_index = current_index - 1;
                while (end_index > 0)
                {
                    char const end_character = input[end_index];
                    if (std::isalpha(end_character))
                    {
                        files.push_back(std::string_view{&input[start_index], end_index + 1 - start_index});
                        break;
                    }

                    end_index -= 1;
                }

                start_index = current_index;
                while (start_index < input.size())
                {
                    char const start_character = input[start_index];
                    if (std::isalpha(start_character))
                        break;

                    start_index += 1;
                }
            }

            current_index += 1;
        }

        std::filesystem::file_time_type const output_time = std::filesystem::last_write_time(output_dependency_file);

        for (std::string_view const& file_path_string : files)
        {
            std::filesystem::path const file_path = file_path_string;
            if (!std::filesystem::exists(file_path))
                return false;

            std::filesystem::file_time_type const input_time = std::filesystem::last_write_time(file_path);
            if (input_time > output_time)
                return false;
        }

        return true;
    }

    bool compile_cpp_and_write_to_bitcode_files(
        Builder& builder,
        std::span<Artifact const> const artifacts,
        LLVM_data& llvm_data,
        Compilation_options const& compilation_options,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        start_timer(get_profiler(builder), "compile_cpp_and_write_to_bitcode_files");

        bool const use_objects = builder.compilation_options.output_debug_code_view;
        std::string_view const extension = use_objects ? "obj" : "bc";
        std::filesystem::path const build_directory_path = get_hl_build_directory(builder.build_directory_path);

        bool const use_clang_cl = builder.target.operating_system == "windows";

        for (Artifact const& artifact : artifacts)
        {
            std::pmr::vector<std::filesystem::path> const public_include_directories = get_public_include_directories(artifact, artifacts, temporaries_allocator, temporaries_allocator);
            std::pmr::vector<std::pmr::string> const public_include_directories_strings = h::common::convert_path_to_string(public_include_directories, temporaries_allocator);

            for (Source_group const& group : artifact.sources)
            {
                if (!group.data.has_value() || !std::holds_alternative<Cpp_source_group>(*group.data))
                    continue;

                std::pmr::vector<std::filesystem::path> const source_file_paths = find_included_files(
                    artifact.file_path.parent_path(),
                    group.include,
                    temporaries_allocator,
                    temporaries_allocator
                );

                for (std::filesystem::path const& source_file_path : source_file_paths)
                {
                    std::filesystem::path const output_assembly_file = build_directory_path / std::format("{}.{}.{}", artifact.name, source_file_path.stem().generic_string(), extension);
                    std::filesystem::path const output_llvm_ir_file = build_directory_path / std::format("{}.{}.ll", artifact.name, source_file_path.stem().generic_string());
                    std::filesystem::path const output_dependency_file = build_directory_path / std::format("{}.{}.d", artifact.name, source_file_path.stem().generic_string());

                    if (is_compiled_cpp_up_to_date(output_dependency_file))
                        continue;

                    if (builder.output_llvm_ir)
                    {
                        std::filesystem::path const output_file_path = build_directory_path / std::format("{}.{}.{}", artifact.name, source_file_path.stem().generic_string(), "ll");
                        bool const success = compile_cpp(
                            *llvm_data.clang_data.compiler_instance,
                            llvm_data.target_triple,
                            source_file_path,
                            output_llvm_ir_file,
                            std::nullopt,
                            public_include_directories_strings,
                            group.additional_flags,
                            use_clang_cl,
                            compilation_options.debug,
                            temporaries_allocator
                        );
                        if (!success)
                        {
                            end_timer(get_profiler(builder), "compile_cpp_and_write_to_bitcode_files");
                            return false;
                        } 
                    }

                    bool const success = compile_cpp(
                        *llvm_data.clang_data.compiler_instance,
                        llvm_data.target_triple,
                        source_file_path,
                        output_assembly_file,
                        output_dependency_file,
                        public_include_directories_strings,
                        group.additional_flags,
                        use_clang_cl,
                        compilation_options.debug,
                        temporaries_allocator
                    );
                    if (!success)
                    {
                        end_timer(get_profiler(builder), "compile_cpp_and_write_to_bitcode_files");
                        return false;
                    }
                }
            }
        }

        end_timer(get_profiler(builder), "compile_cpp_and_write_to_bitcode_files");
        return true;
    }

    void add_builtin_module(
        std::pmr::vector<h::Module>& header_modules,
        std::pmr::polymorphic_allocator<> const& output_allocator,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        std::filesystem::path const builtin_file_path = BUILTIN_SOURCE_FILE_PATH;
        
        std::optional<h::Module> builtin_module = h::parser::parse_and_convert_to_module(builtin_file_path, output_allocator, temporaries_allocator);
        if (!builtin_module.has_value())
            throw std::runtime_error{"Failed to read builtin module!"};

        header_modules.push_back(std::move(builtin_module.value()));
    }

    std::pmr::vector<h::Module> parse_source_files_and_cache(
        Builder& builder,
        std::span<std::filesystem::path const> const source_files_paths,
        std::pmr::polymorphic_allocator<> const& output_allocator,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        start_timer(get_profiler(builder), "parse_source_files_and_cache");

        std::pmr::vector<h::Module> core_modules{output_allocator};
        core_modules.resize(source_files_paths.size(), h::Module{});

        h::parser::Parser parser = h::parser::create_parser();

        for (std::size_t index = 0; index < source_files_paths.size(); ++index)
        {
            std::filesystem::path const& source_file_path = source_files_paths[index];

            std::optional<std::pmr::string> const module_name = h::parser::read_module_name(source_file_path);
            if (!module_name.has_value())
                h::common::print_message_and_exit(std::format("Could not read module name of source file {}.", source_file_path.generic_string()));

            std::filesystem::path const output_module_filename = std::format("{}.hlb", module_name.value());
            std::filesystem::path const output_module_path = get_hl_build_directory(builder.build_directory_path) / output_module_filename;

            if (std::filesystem::exists(output_module_path))
            {
                if (is_file_newer_than(output_module_path, source_file_path))
                {
                    std::optional<Module> core_module = h::binary_serializer::read_module_from_file(output_module_path);
                    if (!core_module.has_value())
                        h::common::print_message_and_exit(std::format("Failed to read cached module {}.", output_module_path.generic_string()));

                    core_modules[index] = std::move(core_module.value());

                    continue;
                }
            }

            std::optional<std::pmr::string> const source_content = h::common::get_file_contents(source_file_path);
            if (!source_content.has_value())
                h::common::print_message_and_exit(std::format("Could not read source file {}.", source_file_path.generic_string()));

            std::pmr::u8string const utf_8_source_content{reinterpret_cast<char8_t const*>(source_content->data()), source_content->size(), temporaries_allocator};
            h::parser::Parse_tree parse_tree = h::parser::parse(parser, std::move(utf_8_source_content));

            h::parser::Parse_node const root = get_root_node(parse_tree);
    
            std::optional<h::Module> core_module = h::parser::parse_node_to_module(
                parse_tree,
                root,
                source_file_path,
                output_allocator,
                temporaries_allocator
            );
            if (!core_module.has_value())
                h::common::print_message_and_exit(std::format("Could not parse source file {}.", source_file_path.generic_string()));

            h::binary_serializer::write_module_to_file(output_module_path, core_module.value(), {});

            if (builder.output_module_json)
            {
                std::filesystem::path const output_module_json_filename = std::format("{}.hlb.json", module_name.value());
                std::filesystem::path const output_module_json_path = get_hl_build_directory(builder.build_directory_path) / output_module_json_filename;
                h::json::write<h::Module>(output_module_json_path, core_module.value());
            }

            core_modules[index] = std::move(core_module.value());

            h::parser::destroy_tree(std::move(parse_tree));
        }

        h::parser::destroy_parser(std::move(parser));

        end_timer(get_profiler(builder), "parse_source_files_and_cache");

        return core_modules;
    }

    std::pmr::unordered_map<std::pmr::string, std::filesystem::path> create_module_name_to_file_path_map(
        Builder const& builder,
        std::span<h::Module const> const header_modules,
        std::span<h::Module const> const core_modules,
        std::pmr::polymorphic_allocator<> const& output_allocator,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        std::pmr::unordered_map<std::pmr::string, std::filesystem::path> map{temporaries_allocator};

        auto const insert_entries = [&](std::span<h::Module const> const elements) -> void {
            for (h::Module const& core_module : elements)
            {
                std::string_view const module_name = core_module.name;

                std::filesystem::path const module_filename = std::format("{}.hlb", module_name);
                std::filesystem::path const output_module_path = get_hl_build_directory(builder.build_directory_path) / module_filename;

                map.insert(std::make_pair(std::pmr::string{ module_name }, output_module_path));
            }
        };

        insert_entries(header_modules);
        insert_entries(core_modules);

        return std::pmr::unordered_map<std::pmr::string, std::filesystem::path>{std::move(map), output_allocator};
    }

    void compile_and_write_to_bitcode_files(
        Builder& builder,
        std::span<h::Module const> const core_modules,
        std::pmr::unordered_map<std::pmr::string, std::filesystem::path> const& module_name_to_file_path_map,
        LLVM_data& llvm_data,
        Compilation_database& compilation_database,
        Compilation_options const& compilation_options
    )
    {
        start_timer(get_profiler(builder), "compile_and_write_to_bitcode_files");

        // TODO to paralelize, llvm_data and compilation_database should be const

        bool const use_objects = builder.compilation_options.output_debug_code_view;
        std::string_view const extension = use_objects ? "obj" : "bc";

        for (std::size_t index = 0; index < core_modules.size(); ++index)
        {
            h::Module const& core_module = core_modules[index];

            std::filesystem::path const output_assembly_file = get_bitcode_build_directory(builder.build_directory_path) / std::format("{}.{}", core_module.name, extension);
            std::filesystem::path const output_llvm_ir_file = get_bitcode_build_directory(builder.build_directory_path) / std::format("{}.{}", core_module.name, "ll");

            if (std::filesystem::exists(output_assembly_file))
            {
                if (!builder.output_llvm_ir || std::filesystem::exists(output_llvm_ir_file))
                {
                    std::filesystem::path const& input_module_file = module_name_to_file_path_map.at(core_module.name);

                    if (is_file_newer_than(output_assembly_file, input_module_file))
                    {
                        continue;
                    }
                }
            }

            std::unique_ptr<llvm::Module> llvm_module = create_llvm_module(
                llvm_data,
                core_module,
                module_name_to_file_path_map,
                compilation_database,
                compilation_options
            );

            if (builder.output_llvm_ir)
                h::compiler::write_llvm_ir_to_file(*llvm_module, output_llvm_ir_file);

            if (use_objects)
                h::compiler::write_object_file(llvm_data, *llvm_module, output_assembly_file);
            else
                h::compiler::write_bitcode_to_file(llvm_data, *llvm_module, output_assembly_file);
        }

        end_timer(get_profiler(builder), "compile_and_write_to_bitcode_files");
    }

    std::pmr::vector<std::filesystem::path> get_artifact_bitcode_files(
        Builder const& builder,
        Artifact const& artifact,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        std::pmr::vector<std::filesystem::path> bitcode_files{temporaries_allocator};

        std::filesystem::path const build_directory_path = get_hl_build_directory(builder.build_directory_path);

        std::pmr::vector<std::filesystem::path> const hlang_source_files = get_artifact_hlang_source_files(
            artifact,
            temporaries_allocator,
            temporaries_allocator
        );

        bool const use_objects = builder.compilation_options.output_debug_code_view;
        std::string_view const extension = use_objects ? "obj" : "bc";

        for (std::filesystem::path const& source_file_path : hlang_source_files)
        {
            std::optional<std::pmr::string> const module_name = h::parser::read_module_name(source_file_path);
            if (!module_name.has_value())
                h::common::print_message_and_exit(std::format("Could not read module name of source file {}.", source_file_path.generic_string()));

            std::filesystem::path bitcode_file = build_directory_path / std::format("{}.{}", module_name.value(), extension);
            bitcode_files.push_back(std::move(bitcode_file));
        }
        
        std::pmr::vector<std::filesystem::path> const cpp_source_files = get_artifact_cpp_source_files(
            artifact,
            temporaries_allocator,
            temporaries_allocator
        );

        for (std::filesystem::path const& source_file_path : cpp_source_files)
        {
            std::filesystem::path bitcode_file = build_directory_path / std::format("{}.{}.{}", artifact.name, source_file_path.stem().generic_string(), extension);
            bitcode_files.push_back(std::move(bitcode_file));
        }

        return bitcode_files;
    }

    struct Artifact_libraries
    {
        std::pmr::vector<std::pmr::string> libraries;
        std::pmr::vector<std::pmr::string> dll_names;
    };

    void add_dependency_libraries(
        Artifact_libraries& artifact_libraries,
        Artifact const& artifact,
        std::span<Artifact const> const artifacts,
        h::compiler::Target const& target,
        std::filesystem::path const& build_directory_path,
        h::compiler::Compilation_options const& compilation_options
    )
    {
        if (artifact.info.has_value())
        {
            if (std::holds_alternative<Library_info>(*artifact.info))
            {
                Library_info const& library_info = std::get<Library_info>(*artifact.info);
        
                std::optional<h::compiler::External_library_info> const external_library = h::compiler::get_external_library(library_info.external_libraries, target, compilation_options.debug, true);
                if (external_library.has_value())
                {
                    for (std::pmr::string const& name : external_library->names)
                        artifact_libraries.libraries.push_back(name);

                    std::pmr::vector<std::string_view> const dll_names = h::compiler::get_external_library_dlls(library_info.external_libraries, external_library.value().key);
                    for (std::string_view const dll_name : dll_names)
                    {
                        artifact_libraries.dll_names.push_back(std::pmr::string{dll_name});
                    }
                }
            }
        }

        for (Dependency const& dependency : artifact.dependencies)
        {
            auto const location = std::find_if(
                artifacts.begin(),
                artifacts.end(),
                [&](Artifact const& artifact) -> bool { return artifact.name == dependency.artifact_name; }
            );
            if (location == artifacts.end())
                continue;

            if (contains_any_compilable_source(*location))
            {
                std::filesystem::path const output_path = build_directory_path / "lib" / location->name;
                artifact_libraries.libraries.push_back(std::pmr::string{output_path.generic_string()});
            }

            add_dependency_libraries(
                artifact_libraries,
                *location,
                artifacts,
                target,
                build_directory_path,
                compilation_options
            );
        }
    }

    Artifact_libraries get_artifact_libraries_for_linking(
        Artifact const& artifact,
        std::span<Artifact const> const artifacts,
        h::compiler::Target const& target,
        std::filesystem::path const& build_directory_path,
        h::compiler::Compilation_options const& compilation_options,
        std::pmr::polymorphic_allocator<> const& output_allocator,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        Artifact_libraries artifact_libraries
        {
            .libraries = std::pmr::vector<std::pmr::string>{temporaries_allocator},
            .dll_names = std::pmr::vector<std::pmr::string>{temporaries_allocator}
        };
        
        add_dependency_libraries(
            artifact_libraries,
            artifact,
            artifacts,
            target,
            build_directory_path,
            compilation_options
        );

        return
        {
            .libraries = std::pmr::vector<std::pmr::string>{std::move(artifact_libraries.libraries), output_allocator},
            .dll_names = std::pmr::vector<std::pmr::string>{std::move(artifact_libraries.dll_names), output_allocator}
        };
    }

    void link_artifacts(
        Builder& builder,
        std::span<Artifact const> const artifacts,
        h::compiler::Compilation_options const& compilation_options,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        start_timer(get_profiler(builder), "link_artifacts");

        for (std::size_t index = 0; index < artifacts.size(); ++index)
        {
            Artifact const& artifact = artifacts[index];

            std::pmr::vector<std::filesystem::path> const bitcode_files = get_artifact_bitcode_files(
                builder,
                artifact,
                temporaries_allocator
            );
            if (bitcode_files.empty())
                continue;

            Artifact_libraries const artifact_libraries = get_artifact_libraries_for_linking(
                artifact,
                artifacts,
                builder.target,
                builder.build_directory_path,
                compilation_options,
                temporaries_allocator,
                temporaries_allocator
            );

            if (artifact.type == Artifact_type::Library)
            {
                h::compiler::Linker_options const linker_options
                {
                    .entry_point = std::nullopt,
                    .debug = compilation_options.debug,
                    .link_type = h::compiler::Link_type::Static_library
                };

                std::filesystem::path const output = builder.build_directory_path / "lib" / artifact.name;
                create_directory_if_it_does_not_exist(output.parent_path());

                bool const result = h::compiler::create_static_library(
                    bitcode_files,
                    artifact_libraries.libraries,
                    output,
                    linker_options
                );
                if (!result)
                    h::common::print_message_and_exit(std::format("Failed to link static library '{}'.", artifact.name));
            }
            else if (artifact.info.has_value() && std::holds_alternative<h::compiler::Executable_info>(*artifact.info))
            {
                h::compiler::Executable_info const& executable_info = std::get<h::compiler::Executable_info>(*artifact.info);

                h::compiler::Linker_options const linker_options
                {
                    .entry_point = executable_info.entry_point,
                    .debug = compilation_options.debug,
                    .link_type = h::compiler::Link_type::Executable
                };

                std::filesystem::path const output = builder.build_directory_path / "bin" / artifact.name;
                create_directory_if_it_does_not_exist(output.parent_path());

                bool const result = h::compiler::link(
                    bitcode_files,
                    artifact_libraries.libraries,
                    output,
                    linker_options
                );
                if (!result)
                    h::common::print_message_and_exit(std::format("Failed to link executable '{}'.", artifact.name));
            }
        }

        end_timer(get_profiler(builder), "link_artifacts");
    }

    void copy_dll(
        std::string_view const dll_name,
        std::filesystem::path const& output_directory
    )
    {
        std::filesystem::path const dll_path = dll_name;
        if (!std::filesystem::exists(dll_path))
        {
            std::fprintf(stderr, "Copy dll: could not find dll '%s'.\n", dll_name.data());
            return;
        }

        std::filesystem::path const destination_path = output_directory / dll_path.filename();

        if (std::filesystem::exists(destination_path) && is_file_newer_than(destination_path, dll_path))
            return;

        std::string const source_string = dll_path.generic_string();
        std::string const destination_string = destination_path.generic_string();

        std::filesystem::copy_options const copy_options = std::filesystem::copy_options::update_existing;
        bool const success = std::filesystem::copy_file(dll_path, destination_path, copy_options);
        if (success)
            std::printf("Copy dll: copied '%s' to '%s'.\n", source_string.c_str(), destination_string.c_str());
    }

    void copy_dlls(
        Builder const& builder,
        std::span<Artifact const> const artifacts,
        std::pmr::polymorphic_allocator<> const& temporaries_allocator
    )
    {
        std::filesystem::path const output_directory = builder.build_directory_path / "bin";

        for (std::size_t artifact_index = 0; artifact_index < artifacts.size(); ++artifact_index)
        {
            Artifact const& artifact = artifacts[artifact_index];

            if (artifact.info.has_value() && std::holds_alternative<Library_info>(artifact.info.value()))
            {
                Library_info const& library_info = std::get<Library_info>(artifact.info.value());

                bool const prefer_debug = builder.compilation_options.debug;
                bool const prefer_dynamic = true;

                std::optional<External_library_info> const external_library_info = get_external_library(
                    library_info.external_libraries,
                    builder.target,
                    prefer_debug,
                    prefer_dynamic
                );

                if (external_library_info.has_value())
                {
                    std::string_view const key = external_library_info.value().key;

                    std::pmr::vector<std::string_view> const external_library_dlls = get_external_library_dlls(
                        library_info.external_libraries,
                        key
                    );

                    for (std::string_view const dll_name : external_library_dlls)
                    {
                        copy_dll(dll_name, output_directory);
                    }
                }
            }
        }
    }

    bool is_file_newer_than(
        std::filesystem::path const& first,
        std::filesystem::path const& second
    )
    {
        std::filesystem::file_time_type first_time = std::filesystem::last_write_time(first);
        std::filesystem::file_time_type second_time = std::filesystem::last_write_time(second);
        return first_time > second_time;
    }

    void print_struct_layout(
        std::filesystem::path const input_file_path,
        std::string_view const struct_name,
        std::optional<std::string_view> const target_triple
    )
    {
        std::optional<h::Module> core_module = h::compiler::read_core_module(input_file_path);
        if (!core_module.has_value())
            h::common::print_message_and_exit(std::format("Failed to read module of '{}'", input_file_path.generic_string()));

        h::compiler::Compilation_options const options
        {
            .target_triple = target_triple,
            .is_optimized = false,
            .debug = true,
        };
        h::compiler::LLVM_data llvm_data = h::compiler::initialize_llvm(options);

        h::Declaration_database declaration_database = h::create_declaration_database();
        h::add_declarations(declaration_database, *core_module);

        std::pmr::vector<h::Module const*> core_modules{ &core_module.value() };
        h::compiler::Clang_module_data clang_module_data = h::compiler::create_clang_module_data(
            *llvm_data.context,
            llvm_data.clang_data,
            "Hl_clang_module",
            {},
            core_modules,
            declaration_database
        );

        h::compiler::Type_database type_database = h::compiler::create_type_database(*llvm_data.context);
        h::compiler::add_module_types(type_database, *llvm_data.context, llvm_data.data_layout, clang_module_data, *core_module);

        std::optional<h::Struct_layout> const struct_layout = h::compiler::calculate_struct_layout(llvm_data.data_layout, type_database, core_module->name, struct_name);
        if (!struct_layout.has_value())
        {
            std::puts("<error>");
            return;
        }

        std::stringstream string_stream;
        string_stream << struct_layout.value();
        std::string const output = string_stream.str();
        std::puts(output.c_str());
    }

    void write_compile_commands_json_to_file(
        Builder const& builder,
        std::filesystem::path const& artifact_file_path,
        h::compiler::Compilation_options const& compilation_options,
        std::filesystem::path const output_file_path
    )
    {
        std::pmr::polymorphic_allocator<> temporaries_allocator;

        std::filesystem::path const build_directory_path = get_hl_build_directory(builder.build_directory_path);
        bool const use_clang_cl = builder.target.operating_system == "windows";
        bool const use_objects = builder.compilation_options.output_debug_code_view;

        std::pmr::vector<Artifact> const artifacts = get_sorted_artifacts(
            { &artifact_file_path, 1 },
            builder.repositories,
            temporaries_allocator,
            temporaries_allocator
        );

        std::pmr::vector<Compile_command> const commands = create_compile_commands(
            artifacts,
            build_directory_path,
            use_clang_cl,
            use_objects,
            temporaries_allocator,
            temporaries_allocator
        );

        write_compile_commands_to_file(commands, output_file_path);
    }
}
