module;

#include <cstdint>
#include <filesystem>
#include <optional>
#include <utility>

#include <clang-c/Index.h>
#include <xxhash.h>

module h.c_header_hash;

namespace h::c
{
    bool calculate_file_hash(std::filesystem::path const& file_path, XXH64_state_t* const state)
    {
        constexpr std::size_t buffer_size = 4*1024;
        std::byte buffer[buffer_size];

        std::FILE* const file = std::fopen(file_path.generic_string().c_str(), "r");
        if (file == nullptr)
            return false;

        std::size_t read_bytes = buffer_size;
        while (read_bytes == buffer_size)
        {
            read_bytes = std::fread(buffer, sizeof(std::byte), buffer_size, file);
            if (XXH64_update(state, buffer, read_bytes) == XXH_ERROR)
            {
                std::fclose(file);        
                return false;
            }
        }

        std::fclose(file);

        return true;
    }

    std::optional<std::uint64_t> calculate_header_file_hash(
        std::filesystem::path const& header_path,
        CXTranslationUnit translation_unit
    )
    {
        struct User_data
        {
            CXTranslationUnit translation_unit = {};
            XXH64_state_t* state = nullptr;
            bool success = true;
        };

        auto const visitor = [](CXFile const included_file, CXSourceLocation* const inclusion_stack, unsigned const include_length, CXClientData const client_data) -> void
        {
            User_data* const user_data = reinterpret_cast<User_data*>(client_data);

            CXSourceLocation const source_location = clang_getLocation(user_data->translation_unit, included_file, 0, 0);

            CXString const file_name = clang_getFileName(included_file);
            std::filesystem::path const file_path = clang_getCString(file_name);
            clang_disposeString(file_name);
            
            if (!calculate_file_hash(file_path, user_data->state))
                user_data->success = false;
        };

        XXH64_state_t* const state = XXH64_createState();
        if (state == nullptr)
            return std::nullopt;

        XXH64_hash_t const seed = 0;
        if (XXH64_reset(state, seed) == XXH_ERROR)
            return std::nullopt;

        User_data user_data
        {
            .translation_unit = translation_unit,
            .state = state,
            .success = true,
        };
        clang_getInclusions(translation_unit, visitor, &user_data);

        XXH64_hash_t const hash = XXH64_digest(state);

        XXH64_freeState(state);

        return hash;
    }
}
