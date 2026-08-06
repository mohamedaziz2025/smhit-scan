import 'package:flutter/material.dart';
import '../../app/theme.dart';

/// Identité visuelle SMHIT recréée pour l'app (§12 : "ne pas reproduire de
/// logos tiers, recréer une identité propre inspirée de l'orange SMHIT").
/// Marque abstraite : bouclier (protection) + éclat radiant (intervention).
class SmhitLogo extends StatelessWidget {
  final double size;
  const SmhitLogo({super.key, this.size = 56});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        gradient: SmhitColors.brandGradient,
        borderRadius: BorderRadius.circular(size * 0.32),
        boxShadow: smhitBrandShadow(),
      ),
      child: Icon(Icons.shield_moon_outlined, color: Colors.white, size: size * 0.56),
    );
  }
}
