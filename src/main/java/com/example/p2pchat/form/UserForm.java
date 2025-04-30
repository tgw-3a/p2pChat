package com.example.p2pchat.form;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UserForm {
    @NotBlank(message = "ニックネームを入力してください")
    private String nickName;

    @NotBlank(message = "紹介コードを入力してください")
    private String usedReferralCode;

    @NotBlank(message = "パスワードを入力してください")
    private String password;
}
