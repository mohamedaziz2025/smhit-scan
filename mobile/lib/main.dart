import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';

import 'app/router.dart';
import 'app/theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Doit être initialisé avant tout accès à TokenStorage (persistance JWT) —
  // sans ça, Hive.openBox() lève une exception au premier login.
  await Hive.initFlutter();
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
