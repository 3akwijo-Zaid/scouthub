# ScoutHub Mobile

Flutter application for scouts — reports, watchlist, alerts.

## Setup

```bash
flutter create . --org com.scouthub --project-name scouthub_mobile
flutter pub add dio flutter_secure_storage go_router
flutter run
```

## Structure (once created)

```
lib/
├── main.dart
├── core/
│   ├── api/        # Dio HTTP client
│   ├── auth/       # JWT storage
│   └── router/     # go_router
├── features/
│   ├── auth/
│   ├── players/
│   ├── reports/
│   └── watchlist/
└── shared/
    ├── widgets/
    └── theme/
```
