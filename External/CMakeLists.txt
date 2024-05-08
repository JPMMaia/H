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
