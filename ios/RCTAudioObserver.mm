#import "RCTAudioObserver.h"
// The Swift header below declares CXCallObserverDelegate, so CallKit must come first.
#import <CallKit/CallKit.h>

#if __has_include(<AudioObserver/AudioObserver-Swift.h>)
#import <AudioObserver/AudioObserver-Swift.h>
#else
#import "AudioObserver-Swift.h"
#endif

@implementation RCTAudioObserver {
    AudioObserverImpl *impl;
    dispatch_queue_t queue;
}

- (id)init {
    if (self = [super init]) {
        queue = dispatch_queue_create("com.audioobserver.queue", DISPATCH_QUEUE_SERIAL);
        __weak RCTAudioObserver *weakSelf = self;
        impl = [[AudioObserverImpl alloc] initWithQueue:queue
            onAudioRouteChange:^(NSArray<NSString *> *routes) {
                [weakSelf emitOnAudioRoute:@{@"routes": routes}];
            }
            onCallChange:^(NSString *state) {
                [weakSelf emitOnCall:state];
            }
            onOtherAudioChange:^(NSString *state) {
                [weakSelf emitOnOtherAudio:state];
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
            reject(@"ERR_UNSUPPORTED", [NSString stringWithFormat:@"%@ is not supported on iOS", event], nil);
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

- (void)isAvailableAsync:(NSString *)event
                 resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject
{
    resolve(@([impl isAvailable:event]));
}

- (void)isOtherAudioPlayingAsync:(RCTPromiseResolveBlock)resolve
                          reject:(RCTPromiseRejectBlock)reject
{
    dispatch_async(queue, ^{
        resolve(@([self->impl isOtherAudioPlaying]));
    });
}

// iOS cannot see your own app's audio, so "any media playing" is Android only.
- (void)isMediaPlaybackActiveAsync:(RCTPromiseResolveBlock)resolve
                            reject:(RCTPromiseRejectBlock)reject
{
    reject(@"ERR_UNSUPPORTED", @"mediaPlayback is Android only. Use otherAudio on iOS.", nil);
}

- (void)isInCallAsync:(RCTPromiseResolveBlock)resolve
               reject:(RCTPromiseRejectBlock)reject
{
    dispatch_async(queue, ^{
        resolve(@([[self->impl currentCall] isEqualToString:@"connected"]));
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
    return std::make_shared<facebook::react::NativeAudioObserverSpecJSI>(params);
}

+ (NSString *)moduleName
{
  return @"AudioObserver";
}

@end
