import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app/router.dart';
import 'app/theme.dart';

void main() {
  runApp(const ProviderScope(child: SmhitApp()));
}

class SmhitApp extends ConsumerWidget {
  const SmhitApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: 'SMHIT',
      debugShowCheckedModeBanner: false,
      theme: buildSmhitTheme(),
      routerConfig: router,
    );
  }
}
