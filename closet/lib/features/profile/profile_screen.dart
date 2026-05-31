import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../auth/auth_provider.dart';

final _profileProvider = Provider<User?>((ref) {
  final authAsync = ref.watch(authStateProvider);
  return authAsync.valueOrNull?.session?.user;
});

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(_profileProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFFDF8F8),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: Text(
          'PROFILE',
          style: GoogleFonts.montserrat(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            letterSpacing: 4,
            color: Colors.black,
          ),
        ),
        centerTitle: true,
      ),
      body: user == null
          ? const _NotSignedIn()
          : _ProfileBody(user: user),
    );
  }
}

class _ProfileBody extends ConsumerWidget {
  final User user;
  const _ProfileBody({required this.user});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final name = user.userMetadata?['full_name'] as String? ??
        user.userMetadata?['name'] as String? ??
        user.email?.split('@').first ??
        'CLOSET';
    final avatarUrl = user.userMetadata?['avatar_url'] as String?;
    final email = user.email ?? '';

    return ListView(
      children: [
        const SizedBox(height: 32),
        _AvatarSection(name: name, avatarUrl: avatarUrl),
        const SizedBox(height: 8),
        Center(
          child: Text(
            email,
            style: GoogleFonts.montserrat(
              fontSize: 12,
              color: const Color(0xFF999999),
            ),
          ),
        ),
        const SizedBox(height: 32),
        Container(height: 0.5, color: const Color(0xFFE0E0E0)),
        _MenuItem(
          icon: Icons.style_outlined,
          label: '나의 OOTD',
          onTap: () {},
        ),
        Container(height: 0.5, color: const Color(0xFFE0E0E0)),
        _MenuItem(
          icon: Icons.workspace_premium_outlined,
          label: 'CLOSET Pro',
          trailing: Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            color: Colors.black,
            child: Text(
              'FREE',
              style: GoogleFonts.montserrat(
                fontSize: 9,
                fontWeight: FontWeight.w700,
                color: Colors.white,
                letterSpacing: 1,
              ),
            ),
          ),
          onTap: () {},
        ),
        Container(height: 0.5, color: const Color(0xFFE0E0E0)),
        _MenuItem(
          icon: Icons.settings_outlined,
          label: '설정',
          onTap: () {},
        ),
        Container(height: 0.5, color: const Color(0xFFE0E0E0)),
        const SizedBox(height: 24),
        _SignOutButton(onSignOut: () async {
          await ref.read(authServiceProvider).signOut();
          if (context.mounted) context.go('/login');
        }),
        const SizedBox(height: 40),
      ],
    );
  }
}

class _AvatarSection extends StatelessWidget {
  final String name;
  final String? avatarUrl;
  const _AvatarSection({required this.name, this.avatarUrl});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        CircleAvatar(
          radius: 40,
          backgroundColor: const Color(0xFFE0E0E0),
          backgroundImage:
              avatarUrl != null ? NetworkImage(avatarUrl!) : null,
          child: avatarUrl == null
              ? Text(
                  name.isNotEmpty ? name[0].toUpperCase() : 'C',
                  style: GoogleFonts.montserrat(
                    fontSize: 28,
                    fontWeight: FontWeight.w600,
                    color: Colors.black54,
                  ),
                )
              : null,
        ),
        const SizedBox(height: 12),
        Text(
          name.toUpperCase(),
          style: GoogleFonts.montserrat(
            fontSize: 16,
            fontWeight: FontWeight.w700,
            letterSpacing: 2,
            color: Colors.black,
          ),
        ),
      ],
    );
  }
}

class _MenuItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final Widget? trailing;
  final VoidCallback onTap;
  const _MenuItem({
    required this.icon,
    required this.label,
    required this.onTap,
    this.trailing,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Container(
        color: Colors.white,
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 18),
        child: Row(
          children: [
            Icon(icon, size: 20, color: Colors.black87),
            const SizedBox(width: 16),
            Expanded(
              child: Text(
                label,
                style: GoogleFonts.montserrat(
                  fontSize: 14,
                  color: Colors.black,
                  letterSpacing: 0.5,
                ),
              ),
            ),
            if (trailing != null) trailing!,
            if (trailing == null)
              const Icon(Icons.chevron_right,
                  size: 18, color: Color(0xFFBBBBBB)),
          ],
        ),
      ),
    );
  }
}

class _SignOutButton extends StatelessWidget {
  final VoidCallback onSignOut;
  const _SignOutButton({required this.onSignOut});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onSignOut,
      child: Center(
        child: Text(
          '로그아웃',
          style: GoogleFonts.montserrat(
            fontSize: 13,
            color: const Color(0xFF999999),
            decoration: TextDecoration.underline,
            decorationColor: const Color(0xFF999999),
          ),
        ),
      ),
    );
  }
}

class _NotSignedIn extends StatelessWidget {
  const _NotSignedIn();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Text(
        '로그인이 필요합니다',
        style: GoogleFonts.montserrat(
          fontSize: 13,
          color: const Color(0xFF999999),
        ),
      ),
    );
  }
}
