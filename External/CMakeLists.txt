include(FetchContent)

FetchContent_Declare(
  extern_watcher
  GIT_REPOSITORY https://github.com/e-dant/watcher.git
  GIT_TAG        release/0.10.0
)
FetchContent_GetProperties(extern_watcher)
if(NOT extern_watcher_POPULATED)
    FetchContent_Populate(extern_watcher)
    add_subdirectory(
        ${extern_watcher_SOURCE_DIR}
        ${extern_watcher_BINARY_DIR}
        EXCLUDE_FROM_ALL
    )
endif()

FetchContent_Declare(
  extern_lsp_framework
  GIT_REPOSITORY https://github.com/leon-bckl/lsp-framework.git
  GIT_TAG        9c1a4a92a0df8813d1bd2bde4c041b572b3763fb
)
FetchContent_GetProperties(extern_lsp_framework)
if(NOT extern_lsp_framework_POPULATED)

    set(LSP_USE_SANITIZERS OFF)

    FetchContent_Populate(extern_lsp_framework)
    add_subdirectory(
        ${extern_lsp_framework_SOURCE_DIR}
        ${extern_lsp_framework_BINARY_DIR}
        EXCLUDE_FROM_ALL
    )
endif()
