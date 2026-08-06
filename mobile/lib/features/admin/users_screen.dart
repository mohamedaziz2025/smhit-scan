import 'package:flutter/material.dart';

import '../../core/widgets/placeholder_screen.dart';

class AdminUsersScreen extends StatelessWidget {
  const AdminUsersScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const PlaceholderScreen(
      title: 'Utilisateurs',
      icon: Icons.group_outlined,
      moduleNote: 'CRUD users, rôles, activation (SuperAdmin) — Module 8.',
    );
  }
}
