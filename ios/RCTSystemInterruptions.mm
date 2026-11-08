#import "RCTSystemInterruptions.h"

#if __has_include(<SystemInterruptions/SystemInterruptions-Swift.h>)
#import <SystemInterruptions/SystemInterruptions-Swift.h>
#else
#import "SystemInterruptions-Swift.h"
#endif

@implementation RCTSystemInterruptions {
    SystemInterruptions *impl;
    // Methods and audio notifications share this serial queue.
    dispatch_queue_t queue;
}

- (id)init {
    if (self = [super init]) {
        queue = dispatch_queue_create("com.systeminterruptions.queue", DISPATCH_QUEUE_SERIAL);
        __weak RCTSystemInterruptions *weakSelf = self;
        impl = [[SystemInterruptions alloc] initWithQueue:queue onAudioRouteChange:^(NSArray<NSString *> *routes) {
            [weakSelf emitOnAudioRoute:@{@"routes": routes}];
        }];
    }
    return self;
}

- (void)startObservingAsync:(NSString *)event
                    resolve:(RCTPromiseResolveBlock)resolve
                     reject:(RCTPromiseRejectBlock)reject
{
    dispatch_async(queue, ^{
        if ([self->impl startObserving:event]) {
            resolve(nil);
        } else {
            reject(@"ERR_UNSUPPORTED", [NSString stringWithFormat:@"%@ is not supported on iOS yet", event], nil);
        }
    });
}

- (void)stopObservingAsync:(NSString *)event
                   resolve:(RCTPromiseResolveBlock)resolve
                    reject:(RCTPromiseRejectBlock)reject
{
    dispatch_async(queue, ^{
        [self->impl stopObserving:event];
        resolve(nil);
    });
}

- (void)getAudioRoutesAsync:(RCTPromiseResolveBlock)resolve
                     reject:(RCTPromiseRejectBlock)reject
{
    dispatch_async(queue, ^{
        resolve([self->impl currentRoutes]);
    });
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeSystemInterruptionsSpecJSI>(params);
}

+ (NSString *)moduleName
{
  return @"SystemInterruptions";
}

@end
