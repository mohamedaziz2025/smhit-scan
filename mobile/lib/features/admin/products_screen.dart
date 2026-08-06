import 'package:flutter/material.dart';

import '../../core/widgets/placeholder_screen.dart';

class AdminProductsScreen extends StatelessWidget {
  const AdminProductsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const PlaceholderScreen(
      title: 'Catalogue produits',
      icon: Icons.inventory_2_outlined,
      moduleNote: 'CRUD produits + import Excel (SuperAdmin) — Module 8.',
    );
  }
}
