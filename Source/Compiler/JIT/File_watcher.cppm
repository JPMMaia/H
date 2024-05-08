module;

#include <wtr/watcher.hpp>

#include <filesystem>
#include <functional>
#include <memory_resource>
#include <span>
#include <vector>

export module h.compiler.file_watcher;

import h.compiler.artifact;
import h.compiler.repository;

using namespace wtr::watcher;

namespace h::compiler
{
    using Wtr_watcher_deleter = void(void*);

    export struct File_watcher
    {
        wtr::event::callback callback;

        // TODO using void* because MSVC can't compile this:
        // std::pmr::vector<std::unique_ptr<wtd::watch::watcher>> wtr_watchers;
        std::pmr::vector<void*> wtr_watchers;

        ~File_watcher();
    };

    export std::unique_ptr<File_watcher> watch(
        Artifact const& artifact,
        std::span<std::filesystem::path const> const repositories_file_paths,
        std::function<void(wtr::watcher::event const&)> callback
    );
}
