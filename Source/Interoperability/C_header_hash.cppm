module;

#include <cstdint>
#include <filesystem>
#include <optional>

#include <clang-c/Index.h>

export module h.c_header_hash;

namespace h::c
{
    export std::optional<std::uint64_t> calculate_header_file_hash(std::filesystem::path const& header_path, CXTranslationUnit translation_unit);
}
