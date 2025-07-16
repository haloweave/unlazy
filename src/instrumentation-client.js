import posthog from 'posthog-js'

if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
        debug: process.env.NODE_ENV === 'development',
        disable_session_recording: true,
        capture_pageview: true,
        autocapture: true,
        cross_subdomain_cookie: false,
        secure_cookie: true,
        persistence: 'localStorage'
    });

    if (process.env.NODE_ENV === 'development') {
        console.log('PostHog initialized successfully');
    }
}