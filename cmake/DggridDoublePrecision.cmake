# DggridDoublePrecision.cmake
#
# DGGRID does nearly all of its math in `long double`. On wasm32 that type is
# IEEE binary128, which WebAssembly has no hardware for: every operation
# becomes a soft-float library call (__multf3, __addtf3, ...), and profiling
# showed ~90% of the runtime there. Clang rejects -mlong-double-64 for wasm32,
# so instead this copies the dglib/proj4lib sources into the build tree with
#
#   long double      -> double
#   sinl( cosl( ...  -> sin( cos( ...     (libm's long double functions)
#   %Lf %Le %Lg      -> %f %e %g          (printf formats)
#
# leaving the submodule untouched. DGGRID builds where long double is already
# double (MSVC, Apple arm64) compute at this same precision.

# dggrid_double_precision_copy(<src_lib_dir> <out_lib_dir>)
#   Mirrors <src_lib_dir>/{dglib,proj4lib} into <out_lib_dir>, rewritten.
#   Files are only rewritten when their content changes, so rebuilds stay
#   incremental.
function(dggrid_double_precision_copy src_lib_dir out_lib_dir)
    set(math_fns "sin|cos|tan|asin|acos|atan|atan2|sqrt|fabs|pow|floor|ceil|fmod|round|log|exp|log10|trunc|lround|llround|rint|hypot|modf|frexp|ldexp")

    file(GLOB_RECURSE files RELATIVE "${src_lib_dir}"
        "${src_lib_dir}/dglib/*.cpp" "${src_lib_dir}/dglib/*.h" "${src_lib_dir}/dglib/*.hpp"
        "${src_lib_dir}/proj4lib/*.cpp" "${src_lib_dir}/proj4lib/*.h" "${src_lib_dir}/proj4lib/*.hpp")

    foreach(rel IN LISTS files)
        set(src "${src_lib_dir}/${rel}")
        set(dst "${out_lib_dir}/${rel}")
        file(READ "${src}" text)

        string(REPLACE "long double" "double" text "${text}")
        # match only whole identifiers: the call must follow a non-identifier
        # char. That char is consumed, so nested calls (fabsl(fabsl(x))) need
        # another pass; repeat until nothing changes.
        set(prev "")
        while(NOT prev STREQUAL text)
            set(prev "${text}")
            string(REGEX REPLACE "([^A-Za-z0-9_])(${math_fns})l\\(" "\\1\\2(" text "${text}")
        endwhile()
        string(REGEX REPLACE "(%[-+ #0-9.]*)L([fegFEG])" "\\1\\2" text "${text}")

        set(old "")
        if(EXISTS "${dst}")
            file(READ "${dst}" old)
        endif()
        if(NOT old STREQUAL text)
            file(WRITE "${dst}" "${text}")
        endif()
    endforeach()

    # re-run configure when any original source changes
    list(TRANSFORM files PREPEND "${src_lib_dir}/")
    set_property(DIRECTORY APPEND PROPERTY CMAKE_CONFIGURE_DEPENDS ${files})
endfunction()
