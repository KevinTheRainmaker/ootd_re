import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class ShopScreen extends StatelessWidget {
  const ShopScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFDF8F8),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: Text(
          'SHOP',
          style: GoogleFonts.montserrat(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            letterSpacing: 4,
            color: Colors.black,
          ),
        ),
        centerTitle: true,
      ),
      body: const _ShopComingSoon(),
    );
  }
}

class _ShopComingSoon extends StatefulWidget {
  const _ShopComingSoon();

  @override
  State<_ShopComingSoon> createState() => _ShopComingSoonState();
}

class _ShopComingSoonState extends State<_ShopComingSoon> {
  final _emailController = TextEditingController();
  bool _submitted = false;

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  void _onNotify() {
    if (_emailController.text.trim().isNotEmpty) {
      setState(() => _submitted = true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 40),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            const Spacer(flex: 3),
            Text(
              'CLOSET',
              style: GoogleFonts.montserrat(
                fontSize: 38,
                fontWeight: FontWeight.w700,
                letterSpacing: 8,
                color: Colors.black,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'SHOP',
              style: GoogleFonts.montserrat(
                fontSize: 12,
                fontWeight: FontWeight.w400,
                letterSpacing: 6,
                color: const Color(0xFF999999),
              ),
            ),
            const SizedBox(height: 40),
            Container(height: 0.5, color: const Color(0xFFE0E0E0)),
            const SizedBox(height: 40),
            Text(
              '현재 준비 중입니다',
              style: GoogleFonts.montserrat(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: Colors.black,
                letterSpacing: 1,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              '패션 쇼핑 경험을 곧 가져올게요',
              textAlign: TextAlign.center,
              style: GoogleFonts.montserrat(
                fontSize: 13,
                fontWeight: FontWeight.w400,
                color: const Color(0xFF666666),
                height: 1.6,
              ),
            ),
            const Spacer(flex: 2),
            if (!_submitted) ...[
              Text(
                '알림 신청',
                style: GoogleFonts.montserrat(
                  fontSize: 11,
                  letterSpacing: 3,
                  color: const Color(0xFF999999),
                ),
              ),
              const SizedBox(height: 16),
              _EmailField(
                controller: _emailController,
                onSubmit: _onNotify,
              ),
            ] else
              Text(
                '신청해주셔서 감사합니다',
                style: GoogleFonts.montserrat(
                  fontSize: 13,
                  color: Colors.black,
                  letterSpacing: 1,
                ),
              ),
            const Spacer(flex: 2),
          ],
        ),
      ),
    );
  }
}

class _EmailField extends StatelessWidget {
  final TextEditingController controller;
  final VoidCallback onSubmit;
  const _EmailField({required this.controller, required this.onSubmit});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: TextField(
            controller: controller,
            keyboardType: TextInputType.emailAddress,
            style: GoogleFonts.montserrat(fontSize: 13, color: Colors.black),
            decoration: InputDecoration(
              hintText: 'your@email.com',
              hintStyle: GoogleFonts.montserrat(
                fontSize: 13,
                color: const Color(0xFFBBBBBB),
              ),
              enabledBorder: const UnderlineInputBorder(
                borderSide: BorderSide(color: Color(0xFFE0E0E0)),
              ),
              focusedBorder: const UnderlineInputBorder(
                borderSide: BorderSide(color: Colors.black),
              ),
              contentPadding: const EdgeInsets.symmetric(vertical: 8),
            ),
          ),
        ),
        const SizedBox(width: 16),
        GestureDetector(
          onTap: onSubmit,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
            color: Colors.black,
            child: Text(
              'OK',
              style: GoogleFonts.montserrat(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: Colors.white,
                letterSpacing: 2,
              ),
            ),
          ),
        ),
      ],
    );
  }
}
