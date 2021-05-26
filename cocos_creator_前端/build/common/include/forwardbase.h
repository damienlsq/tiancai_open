#ifndef FORWARDBASE_H
#define FORWARDBASE_H

#include "base.h"
#include "defines.h"

namespace forwarder {
    
    typedef void(*DebugFuncPtr)(const char *);
    
    
    class ForwardBase {
    public:
        ForwardBase():
        debug(false),
        debugFunc(nullptr),
        logger(nullptr)
        {}
        
        void setDebug(bool enabled) {
            debug = enabled;
        }
        
        void setLogger(std::shared_ptr<spdlog::logger> _logger){
            logger = _logger;
        }
        
        
        template <typename... Args>
        void logDebug(const char* fmt, const Args&... args) {
            if (debug && logger) logger->info(fmt, args...);
            if (debugFunc) {
                debugFunc(fmt);
            }
        }
        
        template <typename... Args>
        void logInfo(const char* fmt, const Args&... args) {
            if (debug && logger) logger->info(fmt, args...);
            if (debugFunc) {
                debugFunc(fmt);
            }
        }
        
        template <typename... Args>
        void logWarn(const char* fmt, const Args&... args) {
            if (debug && logger) logger->warn(fmt, args...);
            if (debugFunc) {
                debugFunc(fmt);
            }
        }
        
        template <typename... Args>
        void logError(const char* fmt, const Args&... args) {
            if (logger) logger->error(fmt, args...);
            if (debugFunc) {
                debugFunc(fmt);
            }
        }
    protected:
        bool debug;
        DebugFuncPtr debugFunc;
        std::shared_ptr<spdlog::logger> logger;
    };
}


#endif // FORWARDBASE_H
